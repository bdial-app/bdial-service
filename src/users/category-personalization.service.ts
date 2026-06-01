import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { User, Category, UserCategoryInteraction } from '../entities';

// ─── Interaction weight configuration ────────────────────────────────
const INTERACTION_WEIGHTS: Record<string, number> = {
  search: 2,
  view: 1,
  bookmark: 3,
  inquiry: 5,
  contact: 5,
};

// ─── Gender-based default category weight priors ─────────────────────
const GENDER_PRIORS: Record<string, Record<string, number>> = {
  female: {
    'tailoring': 3, 'catering-tiffin': 2, 'mehndi-henna': 3, 'beauty-salon': 3,
    'fashion': 2, 'sweets-bakery': 1.5, 'jewellery': 2, 'daycare-childcare': 1.5,
    'event-planning': 2,
  },
  male: {
    'automotive': 3, 'electronics-repair': 2, 'home-services': 2, 'construction': 2,
    'it-services': 2, 'fitness': 2, 'glass-aluminium': 1.5, 'furniture': 1.5,
    'security-services': 1.5,
  },
  other: {},
};

// ─── Seasonal boosts (month ranges → category slugs) ─────────────────
const SEASONAL_BOOSTS: Array<{ months: number[]; slugs: string[]; boost: number }> = [
  // Ramadan/Eid typically Mar-May (approximate)
  { months: [3, 4, 5], slugs: ['catering-tiffin', 'sweets-bakery', 'fashion', 'perfume-attar', 'grocery'], boost: 2 },
  // Wedding season Oct-Feb
  { months: [10, 11, 12, 1, 2], slugs: ['event-planning', 'photography', 'mehndi-henna', 'catering-tiffin', 'jewellery', 'beauty-salon', 'printing'], boost: 2 },
  // Back to school Jun-Jul
  { months: [6, 7], slugs: ['stationery', 'tuition-coaching'], boost: 1.5 },
];

export interface CategoryWeight {
  categoryId: string;
  categoryName: string;
  slug: string;
  icon: string | null;
  weight: number;
  source: 'behavioral' | 'default' | 'explicit';
}

@Injectable()
export class CategoryPersonalizationService {
  private readonly logger = new Logger(CategoryPersonalizationService.name);

  constructor(
    @InjectRepository(UserCategoryInteraction)
    private readonly interactionRepo: Repository<UserCategoryInteraction>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    private readonly dataSource: DataSource,
  ) {}

  // ─── Record an interaction (upsert) ─────────────────────────────────
  async recordInteraction(
    userId: string,
    categoryId: string,
    type: 'search' | 'view' | 'bookmark' | 'inquiry' | 'contact',
  ): Promise<void> {
    const weight = INTERACTION_WEIGHTS[type] || 1;

    await this.dataSource.query(
      `INSERT INTO user_category_interactions (user_id, category_id, interaction_type, weight, count, last_interaction_at)
       VALUES ($1, $2, $3, $4, 1, NOW())
       ON CONFLICT ON CONSTRAINT uq_user_category_type
       DO UPDATE SET
         count = user_category_interactions.count + 1,
         last_interaction_at = NOW(),
         updated_at = NOW()`,
      [userId, categoryId, type, weight],
    );
  }

  // ─── Record interactions for multiple categories at once ────────────
  async recordInteractionBulk(
    userId: string,
    categoryIds: string[],
    type: 'search' | 'view' | 'bookmark' | 'inquiry' | 'contact',
  ): Promise<void> {
    if (!categoryIds.length) return;
    await Promise.all(
      categoryIds.map((catId) => this.recordInteraction(userId, catId, type)),
    );
  }

  // ─── Get behavioral weights from interaction history ────────────────
  async getBehavioralWeights(userId: string): Promise<CategoryWeight[]> {
    const rows: any[] = await this.dataSource.query(
      `SELECT
        uci.category_id,
        c.name AS category_name,
        c.slug,
        c.icon,
        SUM(uci.weight * uci.count * (
          CASE
            WHEN uci.last_interaction_at > NOW() - INTERVAL '7 days' THEN 1.0
            WHEN uci.last_interaction_at > NOW() - INTERVAL '14 days' THEN 0.8
            WHEN uci.last_interaction_at > NOW() - INTERVAL '30 days' THEN 0.6
            WHEN uci.last_interaction_at > NOW() - INTERVAL '60 days' THEN 0.3
            ELSE 0.1
          END
        )) AS total_weight
      FROM user_category_interactions uci
      JOIN categories c ON c.id = uci.category_id
      WHERE uci.user_id = $1
      GROUP BY uci.category_id, c.name, c.slug, c.icon
      ORDER BY total_weight DESC`,
      [userId],
    );

    return rows.map((r) => ({
      categoryId: r.category_id,
      categoryName: r.category_name,
      slug: r.slug,
      icon: r.icon,
      weight: parseFloat(r.total_weight),
      source: 'behavioral' as const,
    }));
  }

  // ─── Get smart default weights for a user (no interaction history) ──
  async getDefaultWeights(user: User): Promise<CategoryWeight[]> {
    const categories = await this.categoryRepo.find({
      where: { isActive: true, parentId: null as any },
      order: { displayOrder: 'ASC' },
    });

    const currentMonth = new Date().getMonth() + 1;
    const genderPrior = GENDER_PRIORS[user.gender] || {};

    // Area trending (from materialized view, if populated)
    let areaTrending: Record<string, number> = {};
    try {
      const trendingRows: any[] = await this.dataSource.query(
        `SELECT category_id, total_interactions
         FROM area_trending_categories
         WHERE city ILIKE $1
         ORDER BY total_interactions DESC
         LIMIT 10`,
        [user.city ? `%${user.city}%` : '%'],
      );
      const maxInteractions = trendingRows[0]?.total_interactions || 1;
      for (const row of trendingRows) {
        areaTrending[row.category_id] = (row.total_interactions / maxInteractions) * 2;
      }
    } catch {
      // Materialized view might not exist yet — ignore
    }

    const weights: CategoryWeight[] = categories.map((cat) => {
      let weight = 1.0; // base weight

      // Gender prior
      if (genderPrior[cat.slug]) {
        weight += genderPrior[cat.slug];
      }

      // Seasonal boost
      for (const season of SEASONAL_BOOSTS) {
        if (season.months.includes(currentMonth) && season.slugs.includes(cat.slug)) {
          weight += season.boost;
        }
      }

      // Area trending boost
      if (areaTrending[cat.id]) {
        weight += areaTrending[cat.id];
      }

      return {
        categoryId: cat.id,
        categoryName: cat.name,
        slug: cat.slug,
        icon: cat.icon,
        weight,
        source: 'default' as const,
      };
    });

    return weights.sort((a, b) => b.weight - a.weight);
  }

  // ─── Get merged weights (behavioral > explicit > defaults) ──────────
  async getCategoryWeights(userId: string): Promise<CategoryWeight[]> {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) return [];

    // Check if user has enough behavioral data
    const interactionCount = await this.interactionRepo.count({
      where: { userId },
    });

    let weights: CategoryWeight[];

    if (interactionCount >= 3) {
      // Use behavioral weights
      weights = await this.getBehavioralWeights(userId);
    } else {
      // Use smart defaults
      weights = await this.getDefaultWeights(user);
    }

    // If user has explicit preferences, boost those categories
    if (user.preferredCategoryIds?.length) {
      const explicitBoost = 10; // Strong boost for explicit picks
      for (const w of weights) {
        if (user.preferredCategoryIds.includes(w.categoryId)) {
          w.weight += explicitBoost;
          w.source = 'explicit';
        }
      }
      weights.sort((a, b) => b.weight - a.weight);
    }

    return weights;
  }

  // ─── Get top N category IDs for a user (for filtering feeds) ────────
  async getTopCategoryIds(userId: string, limit = 5): Promise<string[]> {
    const weights = await this.getCategoryWeights(userId);
    return weights.slice(0, limit).map((w) => w.categoryId);
  }

  // ─── Set explicit preferred categories ──────────────────────────────
  async setPreferredCategories(userId: string, categoryIds: string[]): Promise<void> {
    await this.userRepo.update(userId, { preferredCategoryIds: categoryIds.length ? categoryIds : null });
  }

  // ─── Refresh materialized views (every 30 minutes) ────────────────────
  @Cron(CronExpression.EVERY_30_MINUTES)
  async refreshMaterializedViews(): Promise<void> {
    try {
      await this.dataSource.query('REFRESH MATERIALIZED VIEW CONCURRENTLY user_category_weights');
      this.logger.log('Refreshed user_category_weights');
    } catch (err) {
      this.logger.warn(`Failed to refresh user_category_weights: ${err instanceof Error ? err.message : err}`);
    }
    try {
      await this.dataSource.query('REFRESH MATERIALIZED VIEW CONCURRENTLY area_trending_categories');
      this.logger.log('Refreshed area_trending_categories');
    } catch (err) {
      this.logger.warn(`Failed to refresh area_trending_categories: ${err instanceof Error ? err.message : err}`);
    }
  }

  // ─── Get personalized category order for homepage ───────────────────
  async getPersonalizedCategories(userId: string, limit = 10): Promise<CategoryWeight[]> {
    const weights = await this.getCategoryWeights(userId);
    return weights.slice(0, limit);
  }

  // ─── Resolve categories matching a search query (for interaction logging) ──
  async resolveCategoriesForQuery(query: string): Promise<string[]> {
    if (!query?.trim()) return [];

    const q = query.toLowerCase().trim();
    // Strip non-alphanumeric tokens — bare punctuation like "&" otherwise becomes
    // ":*" alone and breaks to_tsquery with "syntax error in tsquery".
    const tsQuery = q
      .split(/\s+/)
      .map(w => w.replace(/[^a-z0-9]/g, ''))
      .filter(Boolean)
      .map(w => w + ':*')
      .join(' & ');
    if (!tsQuery) return [];

    const rows: any[] = await this.dataSource.query(
      `SELECT id FROM categories
       WHERE is_active = true AND (
         name ILIKE '%' || $1 || '%'
         OR slug ILIKE '%' || $1 || '%'
         OR EXISTS (SELECT 1 FROM unnest(keywords) kw WHERE kw ILIKE '%' || $1 || '%' OR similarity(kw, $1) > 0.3)
         OR (search_vector IS NOT NULL AND search_vector @@ to_tsquery('english', $2))
       )
       LIMIT 5`,
      [q, tsQuery],
    );

    return rows.map((r) => r.id);
  }
}
