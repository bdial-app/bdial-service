import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { GoogleReviewsService } from '../google-reviews/google-reviews.service';
import { AdminService, type AdminActor } from './admin.service';
import type { AdminReviewListQueryDto } from './dto/admin-review-list.dto';

const IST_DAY = (col: string) => `(${col} AT TIME ZONE 'Asia/Kolkata')::date`;

/** An open report on the review, in either report table. */
const REPORTED_SQL = `(EXISTS (SELECT 1 FROM review_reports rr WHERE rr.review_id = r.id AND rr.status = 'pending')
  OR EXISTS (SELECT 1 FROM reports gr WHERE gr.entity_type = 'review' AND gr.entity_id = r.id AND gr.status IN ('pending', 'under_review')))`;

/** Written from the owner's review link, recorded by an admin, or in the app. */
const SOURCE_SQL = `CASE WHEN r.source = 'link' THEN 'link'
  WHEN EXISTS (SELECT 1 FROM audit_logs a WHERE a.action = 'create_review' AND a.entity_type = 'review' AND a.entity_id = r.id::text) THEN 'admin'
  ELSE 'app' END`;

/** The reviewer's chat with this business, if they ever had one. */
const CONVERSATION_SQL = `(SELECT c.id FROM conversations c
  JOIN conversation_participants a ON a.conversation_id = c.id AND a.role = 'provider' AND a.user_id = p.user_id
  JOIN conversation_participants b ON b.conversation_id = c.id AND b.role = 'customer' AND b.user_id = r.reviewer_id
  ORDER BY c.last_message_at DESC NULLS LAST LIMIT 1)`;

const ROW_SQL = `
  r.id, r.star_rating AS "starRating", r.review_text AS "reviewText", r.status, r.posted_at AS "postedAt",
  r.reply_text AS "replyText", r.replied_at AS "repliedAt", r.moderated_at AS "moderatedAt",
  r.provider_id AS "providerId", r.reviewer_id AS "reviewerId",
  ${SOURCE_SQL} AS source,
  m.name AS "moderatorName",
  u.id AS "u_id", u.name AS "u_name", u.mobile_number AS "u_mobile", u.city AS "u_city", u.status AS "u_status",
  p.id AS "p_id", p.brand_name AS "p_name", p.slug AS "p_slug", p.city AS "p_city", p.area AS "p_area",
  p.profile_photo_url AS "p_photo", p.status AS "p_status", p.user_id AS "p_owner",
  p.combined_rating AS "p_rating", p.combined_review_count AS "p_reviews", p.deleted_at IS NOT NULL AS "p_deleted",
  (SELECT count(*)::int FROM review_photos ph WHERE ph.review_id = r.id) AS "photoCount",
  (SELECT coalesce(json_agg(x.image_url), '[]'::json) FROM (SELECT image_url FROM review_photos ph WHERE ph.review_id = r.id LIMIT 4) x) AS "photoUrls",
  ((SELECT count(*) FROM review_reports rr WHERE rr.review_id = r.id AND rr.status = 'pending')
   + (SELECT count(*) FROM reports gr WHERE gr.entity_type = 'review' AND gr.entity_id = r.id AND gr.status IN ('pending', 'under_review')))::int AS "reportCount",
  ${CONVERSATION_SQL} AS "conversationId",
  (SELECT count(*)::int FROM reviews o WHERE o.reviewer_id = r.reviewer_id AND r.reviewer_id IS NOT NULL) AS "reviewerReviewCount"`;

const FROM_SQL = `FROM reviews r
  JOIN providers p ON p.id = r.provider_id
  LEFT JOIN users u ON u.id = r.reviewer_id
  LEFT JOIN users m ON m.id = r.moderated_by`;

const SORT_SQL: Record<string, string> = {
  recent: 'r.posted_at DESC',
  oldest: 'r.posted_at ASC',
  lowest: 'r.star_rating ASC, r.posted_at DESC',
  highest: 'r.star_rating DESC, r.posted_at DESC',
};

type Row = Record<string, unknown>;

/** A review as the admin app reads it. */
export type AdminReviewRow = Row & {
  id: string;
  providerId: string;
  reviewerId: string | null;
  reviewer: Row | null;
  provider: Row;
};

/** The flat row, with reviewer and business nested the way the admin app reads them. */
const shape = (row: Row): AdminReviewRow => {
  const out: Row = {};
  const reviewer: Row = {};
  const provider: Row = {};
  for (const [k, v] of Object.entries(row)) {
    if (k.startsWith('u_')) reviewer[k.slice(2)] = v;
    else if (k.startsWith('p_')) provider[k.slice(2)] = v;
    else out[k] = v;
  }
  return {
    ...out,
    id: out.id as string,
    providerId: out.providerId as string,
    reviewerId: (out.reviewerId as string | null) ?? null,
    reviewer: reviewer.id
      ? {
          id: reviewer.id,
          name: reviewer.name,
          mobileNumber: reviewer.mobile,
          city: reviewer.city,
          status: reviewer.status,
        }
      : null,
    provider: {
      id: provider.id,
      brandName: provider.name,
      slug: provider.slug,
      city: provider.city,
      area: provider.area,
      profilePhotoUrl: provider.photo,
      status: provider.status,
      userId: provider.owner,
      combinedRating:
        provider.rating == null ? null : Number(provider.rating as string),
      combinedReviewCount: provider.reviews,
      deleted: provider.deleted,
    },
  };
};

/**
 * The admin reviews section: every review with the business it's about, who
 * wrote it, their chat and lead with that business, reports, and moderation.
 */
@Injectable()
export class AdminReviewsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly admin: AdminService,
    private readonly googleReviews: GoogleReviewsService,
  ) {}

  private where(q: AdminReviewListQueryDto) {
    const clauses: string[] = [];
    const params: unknown[] = [];
    const param = (v: unknown) => {
      params.push(v);
      return `$${params.length}`;
    };
    if (q.search?.trim()) {
      const s = param(`%${q.search.trim()}%`);
      clauses.push(
        `(u.name ILIKE ${s} OR u.mobile_number ILIKE ${s} OR p.brand_name ILIKE ${s} OR r.review_text ILIKE ${s} OR r.reply_text ILIKE ${s})`,
      );
    }
    if (q.status) clauses.push(`r.status = ${param(q.status)}`);
    if (q.providerId) clauses.push(`r.provider_id = ${param(q.providerId)}`);
    if (q.reviewerId) clauses.push(`r.reviewer_id = ${param(q.reviewerId)}`);
    if (q.minRating) clauses.push(`r.star_rating >= ${param(q.minRating)}`);
    if (q.maxRating) clauses.push(`r.star_rating <= ${param(q.maxRating)}`);
    if (q.postedFrom)
      clauses.push(
        `${IST_DAY('r.posted_at')} >= ${param(q.postedFrom.slice(0, 10))}::date`,
      );
    if (q.postedTo)
      clauses.push(
        `${IST_DAY('r.posted_at')} <= ${param(q.postedTo.slice(0, 10))}::date`,
      );
    const toggle = (v: string | undefined, sql: string) => {
      if (v === 'true') clauses.push(sql);
      else if (v === 'false') clauses.push(`NOT ${sql}`);
    };
    toggle(
      q.hasPhotos,
      `EXISTS (SELECT 1 FROM review_photos ph WHERE ph.review_id = r.id)`,
    );
    toggle(q.hasReply, `(coalesce(trim(r.reply_text), '') <> '')`);
    toggle(q.hasText, `(coalesce(trim(r.review_text), '') <> '')`);
    toggle(q.reported, REPORTED_SQL);
    if (q.source) clauses.push(`(${SOURCE_SQL}) = ${param(q.source)}`);
    if (q.city)
      clauses.push(`lower(trim(p.city)) = lower(trim(${param(q.city)}))`);
    return {
      sql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
      params,
    };
  }

  async list(adminUser: AdminActor, q: AdminReviewListQueryDto) {
    this.admin.assertAdmin(adminUser);
    const page = q.page ?? 1;
    const limit = q.limit ?? 10;
    const { sql, params } = this.where(q);
    const [rows, [count]] = await Promise.all([
      this.dataSource.query<Row[]>(
        `SELECT ${ROW_SQL} ${FROM_SQL} ${sql}
          ORDER BY ${SORT_SQL[q.sort ?? 'recent']}, r.id
          LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
        params,
      ),
      this.dataSource.query<{ total: number }[]>(
        `SELECT count(*)::int AS total ${FROM_SQL} ${sql}`,
        params,
      ),
    ]);
    const total = count?.total ?? 0;
    return {
      items: rows.map(shape),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /** Segment counts, business cities and the headline numbers for the page. */
  async filterOptions(adminUser: AdminActor) {
    this.admin.assertAdmin(adminUser);
    const [cities, [counts], distribution] = await Promise.all([
      this.dataSource.query<{ name: string; count: number }[]>(
        `SELECT initcap(trim(p.city)) AS name, count(*)::int AS count
           FROM reviews r JOIN providers p ON p.id = r.provider_id
          WHERE p.city IS NOT NULL AND trim(p.city) <> ''
          GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT 100`,
      ),
      this.dataSource.query<Record<string, number>[]>(
        `SELECT
           count(*)::int AS total,
           count(*) FILTER (WHERE r.status = 'active')::int AS active,
           count(*) FILTER (WHERE r.status = 'removed')::int AS removed,
           count(*) FILTER (WHERE r.status = 'flagged')::int AS flagged,
           count(*) FILTER (WHERE r.status = 'active' AND r.star_rating <= 2)::int AS low,
           count(*) FILTER (WHERE r.posted_at > now() - interval '7 days')::int AS "last7d",
           count(*) FILTER (WHERE r.posted_at > now() - interval '30 days')::int AS "last30d",
           count(*) FILTER (WHERE EXISTS (SELECT 1 FROM review_photos ph WHERE ph.review_id = r.id))::int AS "withPhotos",
           count(*) FILTER (WHERE r.status = 'active' AND coalesce(trim(r.reply_text), '') = '')::int AS unreplied,
           count(*) FILTER (WHERE ${REPORTED_SQL})::int AS reported,
           count(*) FILTER (WHERE r.source = 'link')::int AS "fromLink",
           round(avg(r.star_rating) FILTER (WHERE r.status = 'active'), 2)::float AS "avgRating",
           round(avg(r.star_rating) FILTER (WHERE r.status = 'active' AND r.posted_at > now() - interval '30 days'), 2)::float AS "avgRating30d",
           count(DISTINCT r.provider_id) FILTER (WHERE r.status = 'active')::int AS "businessesReviewed"
         FROM reviews r`,
      ),
      this.dataSource.query<{ stars: number; count: number }[]>(
        `SELECT star_rating AS stars, count(*)::int AS count FROM reviews WHERE status = 'active' GROUP BY 1`,
      ),
    ]);
    const replied = counts.active - counts.unreplied;
    return {
      cities,
      counts,
      stats: {
        avgRating: counts.avgRating,
        avgRating30d: counts.avgRating30d,
        replyRate: counts.active
          ? Math.round((replied / counts.active) * 100)
          : null,
        businessesReviewed: counts.businessesReviewed,
        distribution: [5, 4, 3, 2, 1].map((s) => ({
          stars: s,
          count: distribution.find((d) => Number(d.stars) === s)?.count ?? 0,
        })),
      },
    };
  }

  /** One review with everything around it. */
  async detail(adminUser: AdminActor, id: string) {
    this.admin.assertAdmin(adminUser);
    const [row] = await this.dataSource.query<Row[]>(
      `SELECT ${ROW_SQL} ${FROM_SQL} WHERE r.id = $1`,
      [id],
    );
    if (!row) throw new NotFoundException('Review not found');
    const review = shape(row);
    const [photos, reports, lead, others, [business], dist, history, [owner]] =
      await Promise.all([
        this.dataSource.query<Row[]>(
          `SELECT id, image_url AS "imageUrl" FROM review_photos WHERE review_id = $1`,
          [id],
        ),
        this.dataSource.query<Row[]>(
          `SELECT rr.id, 'review_report' AS kind, rr.reason, NULL AS description, rr.status::text, rr.reported_at AS at, u.name AS "reporterName"
           FROM review_reports rr LEFT JOIN users u ON u.id = rr.reporter_id WHERE rr.review_id = $1
         UNION ALL
         SELECT gr.id, 'report', gr.reason::text, gr.description, gr.status::text,
                gr.created_at AT TIME ZONE current_setting('TimeZone'), u.name
           FROM reports gr LEFT JOIN users u ON u.id = gr.reporter_id
          WHERE gr.entity_type = 'review' AND gr.entity_id = $1
         ORDER BY at DESC`,
          [id],
        ),
        review.reviewerId
          ? this.dataSource.query<Row[]>(
              `SELECT id, tier, score, is_unlocked AS "isUnlocked", first_seen_at AS "firstSeenAt", last_seen_at AS "lastSeenAt"
               FROM provider_leads
              WHERE provider_id = $1 AND (user_id = $2 OR visitor_key = $2::text)
              ORDER BY last_seen_at DESC NULLS LAST LIMIT 1`,
              [review.providerId, review.reviewerId],
            )
          : ([] as Row[]),
        review.reviewerId
          ? this.dataSource.query<Row[]>(
              `SELECT r.id, r.star_rating AS "starRating", r.status, r.posted_at AS "postedAt", p.id AS "providerId", p.brand_name AS "brandName"
               FROM reviews r JOIN providers p ON p.id = r.provider_id
              WHERE r.reviewer_id = $1 AND r.id <> $2 ORDER BY r.posted_at DESC LIMIT 6`,
              [review.reviewerId, id],
            )
          : ([] as Row[]),
        this.dataSource.query<Row[]>(
          `SELECT count(*) FILTER (WHERE status = 'active')::int AS active, count(*)::int AS total,
                round(avg(star_rating) FILTER (WHERE status = 'active'), 2)::float AS "avgRating"
           FROM reviews WHERE provider_id = $1`,
          [review.providerId],
        ),
        this.dataSource.query<{ stars: number; count: number }[]>(
          `SELECT star_rating AS stars, count(*)::int AS count FROM reviews
          WHERE provider_id = $1 AND status = 'active' GROUP BY 1`,
          [review.providerId],
        ),
        this.dataSource.query<Row[]>(
          `SELECT a.id, a.action, a.description, a.created_at AT TIME ZONE current_setting('TimeZone') AS at, u.name AS "adminName"
           FROM audit_logs a LEFT JOIN users u ON u.id = a.admin_id
          WHERE a.entity_type = 'review' AND a.entity_id = $1
          ORDER BY a.created_at DESC LIMIT 20`,
          [id],
        ),
        this.dataSource.query<Row[]>(
          `SELECT u.id, u.name, u.mobile_number AS "mobileNumber", p.contact_number AS "contactNumber",
                p.google_rating AS "googleRating", p.google_review_count AS "googleReviewCount"
           FROM providers p LEFT JOIN users u ON u.id = p.user_id WHERE p.id = $1`,
          [review.providerId],
        ),
      ]);
    return {
      ...review,
      photos,
      reports,
      lead: lead[0] ?? null,
      reviewerOtherReviews: others,
      business: {
        activeReviews: business?.active ?? 0,
        totalReviews: business?.total ?? 0,
        avgRating: business?.avgRating ?? null,
        distribution: [5, 4, 3, 2, 1].map((s) => ({
          stars: s,
          count: dist.find((d) => Number(d.stars) === s)?.count ?? 0,
        })),
        owner: owner?.id
          ? { id: owner.id, name: owner.name, mobileNumber: owner.mobileNumber }
          : null,
        contactNumber: owner?.contactNumber ?? null,
        googleRating:
          owner?.googleRating == null ? null : Number(owner.googleRating),
        googleReviewCount: owner?.googleReviewCount ?? null,
      },
      history,
    };
  }

  /**
   * Show or take down a review. Taking it down closes its open reports; either
   * way the business's rating is recomputed and the change is audited.
   */
  async setStatus(
    adminUser: AdminActor,
    id: string,
    status: 'active' | 'removed',
    reason?: string,
  ) {
    this.admin.assertAdmin(adminUser);
    const [review] = await this.dataSource.query<
      { status: string; provider_id: string; brand: string }[]
    >(
      `SELECT r.status, r.provider_id, p.brand_name AS brand FROM reviews r JOIN providers p ON p.id = r.provider_id WHERE r.id = $1`,
      [id],
    );
    if (!review) throw new NotFoundException('Review not found');
    if (review.status === status)
      throw new BadRequestException(`This review is already ${status}`);

    await this.dataSource.query(
      `UPDATE reviews SET status = $2, moderated_at = now(), moderated_by = $3 WHERE id = $1`,
      [id, status, adminUser.id],
    );
    let reportsClosed = 0;
    if (status === 'removed')
      reportsClosed = await this.closeReports(
        adminUser.id,
        id,
        'action_taken',
        reason,
      );

    const note = reason?.trim() ? `: ${reason.trim()}` : '';
    await this.admin.createAuditLog(
      adminUser.id,
      status === 'removed' ? 'remove_review' : 'restore_review',
      'review',
      id,
      { status: review.status },
      {
        status,
        ...(reason?.trim() ? { reason: reason.trim() } : {}),
        ...(reportsClosed ? { reportsClosed } : {}),
      },
      `${status === 'removed' ? 'Removed' : review.status === 'flagged' ? 'Approved' : 'Restored'} a review of ${review.brand}${note}`,
    );
    await this.googleReviews
      .recomputeByProviderId(review.provider_id)
      .catch(() => {});
    return this.detail(adminUser, id);
  }

  /** Keep the review, close its open reports. */
  async dismissReports(adminUser: AdminActor, id: string) {
    this.admin.assertAdmin(adminUser);
    const closed = await this.closeReports(adminUser.id, id, 'dismissed');
    if (!closed)
      throw new BadRequestException('This review has no open reports');
    await this.admin.createAuditLog(
      adminUser.id,
      'dismiss_review_reports',
      'review',
      id,
      null,
      { reportsClosed: closed },
      `Kept the review and dismissed ${closed} report${closed === 1 ? '' : 's'}`,
    );
    return this.detail(adminUser, id);
  }

  private async closeReports(
    adminId: string,
    reviewId: string,
    outcome: 'action_taken' | 'dismissed',
    note?: string,
  ): Promise<number> {
    // Counted first, then closed (a raw UPDATE's result shape isn't the rows).
    const [[a], [b]] = await Promise.all([
      this.dataSource.query<{ n: number }[]>(
        `SELECT count(*)::int AS n FROM review_reports WHERE review_id = $1 AND status = 'pending'`,
        [reviewId],
      ),
      this.dataSource.query<{ n: number }[]>(
        `SELECT count(*)::int AS n FROM reports WHERE entity_type = 'review' AND entity_id = $1 AND status IN ('pending', 'under_review')`,
        [reviewId],
      ),
    ]);
    await Promise.all([
      this.dataSource.query(
        `UPDATE review_reports SET status = $2 WHERE review_id = $1 AND status = 'pending'`,
        [reviewId, outcome === 'dismissed' ? 'dismissed' : 'reviewed'],
      ),
      this.dataSource.query(
        `UPDATE reports SET status = $2, reviewed_by = $3, reviewed_at = now(), admin_notes = coalesce($4, admin_notes)
          WHERE entity_type = 'review' AND entity_id = $1 AND status IN ('pending', 'under_review')`,
        [reviewId, outcome, adminId, note?.trim() || null],
      ),
    ]);
    return (a?.n ?? 0) + (b?.n ?? 0);
  }
}
