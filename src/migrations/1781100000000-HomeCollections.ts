import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Home-screen "needs": collections that gather products and services from a
 * set of categories. Seeded with a starter set; the admin panel manages them.
 * Categories are looked up by name, so a missing one is simply skipped.
 */
const SEED: {
  title: string;
  subtitle: string;
  theme: string;
  type: 'all' | 'product' | 'service';
  categories: string[];
}[] = [
  {
    title: 'Get your home fixed',
    subtitle: 'Plumbers, electricians, AC repair, painters & more',
    theme: 'sky',
    type: 'service',
    categories: [
      'Home Services',
      'Appliance Repair',
      'Painting & Waterproofing',
      'Cleaning Services',
      'Locksmith & Key Maker',
    ],
  },
  {
    title: 'Home appliances & essentials',
    subtitle: 'Lights, fans, kitchenware, furniture & fittings',
    theme: 'amber',
    type: 'product',
    categories: [
      'Electrical Goods & Lighting',
      'Crockery, Utensils & Kitchenware',
      'Furniture & Woodwork',
      'Sanitary Ware & Bathroom Fittings',
      'Hardware & Building Materials',
    ],
  },
  {
    title: "Ridas you'll love",
    subtitle: 'Ready-made or stitched to fit, from local tailors',
    theme: 'rose',
    type: 'all',
    categories: [
      'Rida & Abaya Stitching',
      "Women's Ethnic & Occasion Wear",
      'Textile & Fabric Store',
    ],
  },
  {
    title: 'Shaadi season',
    subtitle: 'Catering, mehndi, decor, photographers & bridal wear',
    theme: 'violet',
    type: 'all',
    categories: [
      'Wedding Catering',
      'Mehndi & Henna',
      'Event Planning',
      'Wedding Photography',
      'Bridal Wear',
      'Makeup & Bridal',
    ],
  },
  {
    title: 'Sweet cravings',
    subtitle: 'Mithai, cakes, namkeen & dry fruits',
    theme: 'orange',
    type: 'product',
    categories: ['Sweets & Bakery'],
  },
  {
    title: 'Hajj & Umrah ready',
    subtitle: 'Tour packages, attar & prayer essentials',
    theme: 'emerald',
    type: 'all',
    categories: [
      'Hajj & Umrah',
      'Religious & Islamic Goods',
      'Perfume & Attar',
    ],
  },
];

export class HomeCollections1781100000000 implements MigrationInterface {
  name = 'HomeCollections1781100000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "home_collections" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "title" varchar(80) NOT NULL,
        "subtitle" varchar(160),
        "theme" varchar(20) NOT NULL DEFAULT 'amber',
        "image_url" varchar(500),
        "listing_type" varchar(10) NOT NULL DEFAULT 'all',
        "category_ids" uuid[] NOT NULL DEFAULT '{}',
        "display_order" int NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "starts_at" timestamptz,
        "ends_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_home_collections_active_order" ON "home_collections" ("is_active", "display_order")`,
    );

    // Seed only into an empty table (re-running never duplicates).
    const [{ count }] = (await queryRunner.query(
      `SELECT COUNT(*)::int AS count FROM "home_collections"`,
    )) as { count: number }[];
    if (count > 0) return;
    for (const [i, c] of SEED.entries()) {
      await queryRunner.query(
        `INSERT INTO "home_collections" ("title", "subtitle", "theme", "listing_type", "category_ids", "display_order")
         VALUES ($1, $2, $3, $4,
           COALESCE((SELECT array_agg(id ORDER BY array_position($5::text[], lower(name))) FROM "categories" WHERE lower(name) = ANY($5::text[]) AND is_active), '{}'),
           $6)`,
        [
          c.title,
          c.subtitle,
          c.theme,
          c.type,
          c.categories.map((n) => n.toLowerCase()),
          i,
        ],
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "home_collections"`);
  }
}
