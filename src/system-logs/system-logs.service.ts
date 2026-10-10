import {
  ForbiddenException,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron } from '@nestjs/schedule';
import { DataSource, Repository } from 'typeorm';
import type { Request } from 'express';
import {
  SystemLog,
  SystemLogLevel,
  SystemLogSource,
} from '../entities/system-log.entity';
import { ROLE_HIERARCHY } from '../common/enums/admin-role.enum';
import { istRange } from '../common/ist-range';
import type { ClientLogEventDto, LogFeedQueryDto } from './dto/system-logs.dto';

/** Every source the admin Logs can show, in the order the filter lists them. */
export const LOG_SOURCES = [
  'server',
  'app',
  'auth',
  'admin',
  'activity',
  'search',
  'notification',
  'whatsapp',
  'payment',
  'report',
  'bug',
  'review',
  'verification',
  'signup',
  'listing',
] as const;
export type LogSource = (typeof LOG_SOURCES)[number];

type RequestWithUser = Request & {
  user?: { id?: string; role?: string };
  requestId?: string;
};

export type LogEntry = Partial<Omit<SystemLog, 'id' | 'createdAt'>> & {
  source: SystemLogSource;
  level: SystemLogLevel;
  category: string;
  event: string;
  message: string;
};

const cut = (v: unknown, max: number): string | null => {
  if (v == null) return null;
  const s = String(v);
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
};

/** Query-string keys that may carry secrets — never stored. */
const SECRET_KEY = /token|otp|password|secret|key|code|auth/i;

/**
 * Records what nothing else does — server errors, app errors, sign-in
 * problems — and reads every kind of activity back as one timeline for the
 * admin Logs, with filters to chase down a user's problem end to end.
 */
@Injectable()
export class SystemLogsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SystemLogsService.name);
  /** Same event repeating within this window is counted, not stored again. */
  private readonly recent = new Map<string, number>();

  constructor(
    @InjectRepository(SystemLog) private readonly repo: Repository<SystemLog>,
    private readonly dataSource: DataSource,
  ) {}

  // ─── Writing ──────────────────────────────────────────────────────────

  /** Store one entry. Never throws and never blocks the caller. */
  record(entry: LogEntry): void {
    const floodKey = `${entry.source}|${entry.event}|${entry.path ?? ''}|${entry.userId ?? ''}|${entry.message.slice(0, 120)}`;
    const now = Date.now();
    const last = this.recent.get(floodKey);
    if (last && now - last < 30_000) return;
    this.recent.set(floodKey, now);
    if (this.recent.size > 2000)
      for (const [k, t] of this.recent)
        if (now - t > 30_000) this.recent.delete(k);

    const row = this.repo.create({
      source: entry.source,
      level: entry.level,
      category: cut(entry.category, 40) ?? 'other',
      event: cut(entry.event, 120) ?? 'event',
      message: cut(entry.message, 2000) ?? '',
      stack: cut(entry.stack, 8000),
      userId:
        entry.userId && /^[0-9a-f-]{36}$/i.test(entry.userId)
          ? entry.userId
          : null,
      userRole: cut(entry.userRole, 20),
      method: cut(entry.method, 10),
      path: cut(entry.path, 300),
      statusCode: entry.statusCode ?? null,
      requestId: cut(entry.requestId, 64),
      sessionId: cut(entry.sessionId, 64),
      platform: cut(entry.platform, 20),
      appVersion: cut(entry.appVersion, 30),
      ip: cut(entry.ip, 45),
      userAgent: cut(entry.userAgent, 300),
      details: entry.details ?? null,
    });
    this.repo
      .save(row)
      .catch((err: Error) =>
        this.logger.warn(`Could not store a log entry: ${err.message}`),
      );
  }

  /** Who and where, from an HTTP request. */
  fromRequest(req: RequestWithUser | undefined): Partial<LogEntry> {
    if (!req) return {};
    const header = (name: string) => {
      const v = req.headers?.[name];
      return Array.isArray(v) ? v[0] : v;
    };
    const query: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(req.query ?? {}))
      if (!SECRET_KEY.test(k)) query[k] = v;
    return {
      userId: req.user?.id ?? null,
      userRole: req.user?.role ?? null,
      method: req.method,
      path: (req.originalUrl ?? req.url ?? '').split('?')[0],
      requestId: req.requestId ?? header('x-request-id') ?? null,
      platform: header('x-platform') ?? null,
      appVersion: header('x-app-version') ?? null,
      ip:
        (header('x-forwarded-for') ?? req.ip ?? '').split(',')[0].trim() ||
        null,
      userAgent: header('user-agent') ?? null,
      details: Object.keys(query).length ? { query } : null,
    };
  }

  /** Errors the apps report (crashes, failed calls), stamped with who sent them. */
  ingestClient(events: ClientLogEventDto[], req: RequestWithUser) {
    const who = this.fromRequest(req);
    for (const e of events.slice(0, 25)) {
      const platform = e.platform ?? who.platform ?? null;
      this.record({
        source: platform === 'admin' ? 'admin' : 'app',
        level: e.level ?? 'error',
        category: e.kind === 'api_error' ? 'api_error' : 'client_error',
        event: e.kind ?? 'js_error',
        message: e.message,
        stack: e.stack ?? null,
        userId: who.userId,
        userRole: who.userRole,
        method: e.method ?? null,
        path: e.apiPath ?? e.screen ?? null,
        statusCode: e.status ?? null,
        requestId: e.requestId ?? null,
        sessionId: e.sessionId ?? null,
        platform,
        appVersion: e.appVersion ?? who.appVersion ?? null,
        ip: who.ip,
        userAgent: who.userAgent,
        details: { screen: e.screen ?? null, ...(e.details ?? {}) },
      });
    }
    return { received: Math.min(events.length, 25) };
  }

  // ─── Reading ──────────────────────────────────────────────────────────

  assertCanRead(user: { role?: string } | undefined) {
    if ((ROLE_HIERARCHY[user?.role ?? ''] ?? 0) < ROLE_HIERARCHY.admin)
      throw new ForbiddenException('Admin access required');
  }

  /**
   * One SELECT per source, each shaped the same way:
   * id, at, source, level, event, message, user_id, provider_id,
   * entity_type, entity_id, session_id, request_id, path, status_code,
   * platform, app_version, details. Time bounds use the raw column so its
   * index applies; columns without a zone hold UTC wall-clock time.
   */
  private branches(): Record<
    LogSource | 'system',
    { sources: LogSource[]; sql: string; systemOnly?: boolean }
  > {
    const uuid = (col: string) =>
      `CASE WHEN ${col}::text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN ${col}::text::uuid END`;
    const none = `NULL::text AS session_id, NULL::text AS request_id, NULL::text AS path, NULL::int AS status_code, NULL::text AS platform, NULL::text AS app_version`;
    return {
      system: {
        sources: ['server', 'app', 'auth'],
        systemOnly: true,
        sql: `SELECT sl.id::text AS id, sl.created_at AS at,
                CASE WHEN sl.category = 'auth' THEN 'auth' WHEN sl.source = 'server' THEN 'server' ELSE 'app' END AS source,
                sl.level, sl.event, sl.message, sl.user_id, NULL::uuid AS provider_id, NULL::text AS entity_type, NULL::text AS entity_id,
                sl.session_id, sl.request_id, sl.path, sl.status_code, sl.platform, sl.app_version,
                jsonb_strip_nulls(jsonb_build_object('method', sl.method, 'stack', sl.stack, 'ip', sl.ip, 'userAgent', sl.user_agent,
                  'role', sl.user_role, 'category', sl.category, 'origin', sl.source)) || COALESCE(sl.details, '{}'::jsonb) AS details
              FROM system_logs sl WHERE sl.created_at >= $1 AND sl.created_at < $2`,
      },
      admin: {
        sources: ['admin'],
        sql: `SELECT a.id::text, a.created_at::timestamptz, 'admin', 'info', a.action, COALESCE(a.description, a.action), a.admin_id,
                CASE WHEN a.entity_type = 'provider' THEN ${uuid('a.entity_id')} END, a.entity_type, a.entity_id, ${none},
                jsonb_strip_nulls(jsonb_build_object('before', a.previous_state, 'after', a.new_state, 'ip', a.ip_address))
              FROM audit_logs a WHERE a.created_at >= $1 AND a.created_at < $2`,
      },
      activity: {
        sources: ['activity'],
        sql: `SELECT e.id::text, e.created_at::timestamptz, 'activity', 'info', e.event_type::text,
                initcap(replace(e.event_type::text, '_', ' ')) || COALESCE(' · from ' || replace(e.source::text, '_', ' '), ''),
                e.user_id, e.provider_id,
                CASE e.event_type::text WHEN 'product_view' THEN 'product' WHEN 'offer_viewed' THEN 'offer' WHEN 'photo_viewed' THEN 'photo' END,
                e.entity_id::text, e.session_id, NULL::text, NULL::text, NULL::int, NULL::text, NULL::text,
                jsonb_strip_nulls(jsonb_build_object('source', e.source, 'metadata', e.metadata))
              FROM provider_analytics_events e WHERE e.duration IS NULL AND e.created_at >= $1 AND e.created_at < $2`,
      },
      search: {
        sources: ['search'],
        sql: `SELECT s.id::text, s.created_at::timestamptz, 'search',
                CASE WHEN s.result_count = 0 THEN 'warn' ELSE 'info' END,
                CASE WHEN s.result_count = 0 THEN 'search_no_results' ELSE 'search' END,
                'Searched "' || s.query || '" — ' || s.result_count || ' result' || CASE WHEN s.result_count = 1 THEN '' ELSE 's' END,
                s.user_id, NULL::uuid, NULL::text, NULL::text, ${none},
                jsonb_strip_nulls(jsonb_build_object('query', s.query, 'results', s.result_count, 'city', s.city, 'lat', s.lat, 'lng', s.lng))
              FROM search_logs s WHERE s.created_at >= $1 AND s.created_at < $2`,
      },
      notification: {
        sources: ['notification'],
        sql: `SELECT n.id::text, n.created_at::timestamptz, 'notification', 'info', 'notification_' || n.type::text,
                n.title || COALESCE(' — ' || left(n.body, 160), ''), n.user_id, NULL::uuid, 'notification', n.id::text, ${none},
                jsonb_strip_nulls(jsonb_build_object('type', n.type, 'body', n.body, 'read', n.is_read, 'readAt', n.read_at,
                  'sentAt', n.sent_at, 'batchId', n.batch_id))
              FROM notifications n WHERE n.created_at >= $1 AND n.created_at < $2`,
      },
      whatsapp: {
        sources: ['whatsapp'],
        sql: `SELECT w.id::text, w.created_at::timestamptz, 'whatsapp',
                CASE w.status::text WHEN 'failed' THEN 'error' WHEN 'skipped' THEN 'warn' ELSE 'info' END,
                'whatsapp_' || w.status::text,
                COALESCE(w.template_name, w.kind::text) || ' · ' || w.status::text || COALESCE(' — ' || w.error_message, '') || COALESCE(' — ' || w.skip_reason, ''),
                NULL::uuid, w.provider_id, 'whatsapp_contact', w.contact_id::text, ${none},
                jsonb_strip_nulls(jsonb_build_object('direction', w.direction, 'kind', w.kind, 'errorCode', w.error_code,
                  'campaignId', w.campaign_id, 'waMessageId', w.wa_message_id, 'costInr', w.cost_inr, 'sentAt', w.sent_at,
                  'deliveredAt', w.delivered_at, 'readAt', w.read_at, 'failedAt', w.failed_at))
              FROM whatsapp_messages w WHERE w.created_at >= $1 AND w.created_at < $2`,
      },
      payment: {
        sources: ['payment'],
        sql: `SELECT p.id::text, p.created_at::timestamptz, 'payment',
                CASE p.status::text WHEN 'failed' THEN 'error' WHEN 'refunded' THEN 'warn' ELSE 'info' END,
                'payment_' || p.status::text,
                initcap(replace(p.type::text, '_', ' ')) || ' · ₹' || p.amount || ' · ' || p.status::text,
                NULL::uuid, p.provider_id, 'payment', p.id::text, ${none},
                jsonb_strip_nulls(jsonb_build_object('gateway', p.payment_gateway, 'orderId', p.gateway_order_id,
                  'paymentId', p.gateway_payment_id, 'currency', p.currency, 'voucherId', p.voucher_id,
                  'discount', p.discount_amount, 'metadata', p.metadata))
              FROM payments p WHERE p.created_at >= $1 AND p.created_at < $2`,
      },
      report: {
        sources: ['report'],
        sql: `SELECT r.id::text, r.created_at::timestamptz, 'report', 'warn', 'report_' || r.reason::text,
                'Reported ' || r.entity_type::text || ': ' || replace(r.reason::text, '_', ' ') || COALESCE(' — ' || left(r.description, 160), ''),
                r.reporter_id, CASE WHEN r.entity_type::text = 'provider' THEN ${uuid('r.entity_id')} END,
                r.entity_type::text, r.entity_id::text, ${none},
                jsonb_strip_nulls(jsonb_build_object('status', r.status, 'adminAction', r.admin_action, 'notes', r.admin_notes, 'reviewedAt', r.reviewed_at))
              FROM reports r WHERE r.created_at >= $1 AND r.created_at < $2`,
      },
      bug: {
        sources: ['bug'],
        sql: `SELECT b.id::text, b.created_at::timestamptz, 'bug', 'warn', 'bug_' || b.category::text, left(b.description, 240),
                b.reporter_id, NULL::uuid, 'bug_report', b.id::text, ${none},
                jsonb_strip_nulls(jsonb_build_object('category', b.category, 'status', b.status, 'steps', b.steps_to_reproduce,
                  'device', b.device_info, 'notes', b.admin_notes))
              FROM bug_reports b WHERE b.created_at >= $1 AND b.created_at < $2`,
      },
      review: {
        sources: ['review'],
        sql: `SELECT rv.id::text, rv.posted_at::timestamptz, 'review', CASE WHEN rv.star_rating <= 2 THEN 'warn' ELSE 'info' END,
                'review_' || rv.status::text, rv.star_rating || '★' || COALESCE(' — ' || left(rv.review_text, 160), ''),
                rv.reviewer_id, rv.provider_id, 'review', rv.id::text, ${none},
                jsonb_strip_nulls(jsonb_build_object('status', rv.status, 'flag', rv.flag_reason, 'reply', rv.reply_text))
              FROM reviews rv WHERE rv.posted_at >= $1 AND rv.posted_at < $2`,
      },
      verification: {
        sources: ['verification'],
        sql: `SELECT v.id::text, v.created_at::timestamptz, 'verification', 'info', 'verification_' || v.status::text,
                'Verification ' || replace(v.status::text, '_', ' '), v.user_id, NULL::uuid, 'verification', v.id::text, ${none},
                jsonb_strip_nulls(jsonb_build_object('aadhaar', v.aadhaar_status, 'ijamat', v.ijamat_status, 'notes', v.admin_notes,
                  'reviewer', v.reviewer_name, 'reviewedAt', v.reviewed_at))
              FROM verifications v WHERE v.created_at >= $1 AND v.created_at < $2`,
      },
      signup: {
        sources: ['signup'],
        sql: `SELECT u.id::text, u.created_at::timestamptz, 'signup', 'info',
                CASE WHEN u.supabase_id IS NULL AND u.google_id IS NULL THEN 'account_imported' ELSE 'account_created' END,
                'New account: ' || COALESCE(NULLIF(u.name, ''), u.mobile_number, 'unnamed') || ' (' || u.role::text || ')',
                u.id, NULL::uuid, 'user', u.id::text, ${none},
                jsonb_strip_nulls(jsonb_build_object('role', u.role, 'status', u.status, 'city', u.city, 'sso', u.sso_provider))
              FROM users u WHERE u.created_at >= $1 AND u.created_at < $2`,
      },
      listing: {
        sources: ['listing'],
        sql: `SELECT pr.id::text, pr.created_at::timestamptz, 'listing', 'info', 'business_listed',
                'New business: ' || pr.brand_name || COALESCE(' (' || pr.city || ')', ''),
                pr.user_id, pr.id, 'provider', pr.id::text, ${none},
                jsonb_strip_nulls(jsonb_build_object('status', pr.status, 'city', pr.city, 'area', pr.area))
              FROM providers pr WHERE pr.created_at >= $1 AND pr.created_at < $2`,
      },
    } as Record<
      LogSource | 'system',
      { sources: LogSource[]; sql: string; systemOnly?: boolean }
    >;
  }

  /** Users / businesses a free-text filter means (phone, name or id). */
  private async resolveIds(
    table: 'users' | 'providers',
    term: string | undefined,
  ): Promise<string[] | null> {
    const t = term?.trim();
    if (!t) return null;
    if (
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t)
    )
      return [t];
    const digits = t.replace(/\D/g, '');
    const rows: { id: string }[] =
      table === 'users'
        ? await this.dataSource.query(
            `SELECT id FROM users WHERE ${digits.length >= 6 ? 'mobile_number LIKE $1' : 'name ILIKE $1 OR email ILIKE $1'} LIMIT 50`,
            [digits.length >= 6 ? `%${digits}%` : `%${t}%`],
          )
        : await this.dataSource.query(
            `SELECT id FROM providers WHERE ${digits.length >= 6 ? `regexp_replace(contact_number, '\\D', '', 'g') LIKE $1` : 'brand_name ILIKE $1'} LIMIT 50`,
            [digits.length >= 6 ? `%${digits}%` : `%${t}%`],
          );
    return rows.map((r) => r.id);
  }

  /** The filters as SQL over a branch's shaped columns, with their params. */
  private async buildFilters(q: LogFeedQueryDto, withSourceLevel = true) {
    const range = istRange(q.from, q.to);
    const from =
      range.from ?? new Date(Date.now() - 24 * 3600_000).toISOString();
    const to = range.to ?? new Date(Date.now() + 60_000).toISOString();
    const params: unknown[] = [from, to];
    const conds: string[] = [];
    const p = (v: unknown) => {
      params.push(v);
      return `$${params.length}`;
    };

    const sources = (
      q.sources?.length ? q.sources : [...LOG_SOURCES]
    ) as LogSource[];
    if (withSourceLevel) {
      conds.push(`source = ANY(${p(sources)}::text[])`);
      if (q.levels?.length) conds.push(`level = ANY(${p(q.levels)}::text[])`);
    }
    if (q.q?.trim()) {
      const like = p(`%${q.q.trim()}%`);
      conds.push(
        `(message ILIKE ${like} OR event ILIKE ${like} OR entity_id ILIKE ${like} OR path ILIKE ${like} OR details::text ILIKE ${like})`,
      );
    }
    const users = await this.resolveIds('users', q.user);
    if (users)
      conds.push(users.length ? `user_id = ANY(${p(users)}::uuid[])` : 'false');
    const businesses = await this.resolveIds('providers', q.business);
    if (businesses)
      conds.push(
        businesses.length
          ? `provider_id = ANY(${p(businesses)}::uuid[])`
          : 'false',
      );
    if (q.event?.trim()) conds.push(`event ILIKE ${p(`%${q.event.trim()}%`)}`);
    if (q.entityId?.trim()) conds.push(`entity_id = ${p(q.entityId.trim())}`);
    if (q.sessionId?.trim())
      conds.push(`session_id = ${p(q.sessionId.trim())}`);

    // Only server/app/auth rows carry these.
    const systemOnly = !!(
      q.requestId ||
      q.path ||
      q.status ||
      q.platform ||
      q.appVersion
    );
    if (q.requestId?.trim())
      conds.push(`request_id = ${p(q.requestId.trim())}`);
    if (q.path?.trim()) conds.push(`path ILIKE ${p(`%${q.path.trim()}%`)}`);
    if (q.status) conds.push(`status_code = ${p(q.status)}`);
    if (q.platform?.trim()) conds.push(`platform = ${p(q.platform.trim())}`);
    if (q.appVersion?.trim())
      conds.push(`app_version = ${p(q.appVersion.trim())}`);

    const all = this.branches();
    const chosen = Object.values(all).filter(
      (b) =>
        b.sources.some((s) => sources.includes(s)) &&
        (!systemOnly || b.systemOnly),
    );
    return { params, conds, chosen, p, from, to };
  }

  /** One page of the timeline, newest first; `before` continues a page. */
  async feed(q: LogFeedQueryDto) {
    const limit = Math.min(Math.max(q.limit ?? 50, 1), 500);
    const { params, conds, chosen, p, from, to } = await this.buildFilters(q);
    if (q.before) {
      const [at, id] = q.before.split('|');
      if (at && id) conds.push(`(at, id) < (${p(at)}::timestamptz, ${p(id)})`);
    }
    if (!chosen.length) return { items: [], nextCursor: null, from, to };
    const cap = p(limit + 1);
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const union = chosen
      .map(
        (
          b,
        ) => `(SELECT * FROM (${b.sql}) AS b(id, at, source, level, event, message, user_id, provider_id, entity_type, entity_id,
                  session_id, request_id, path, status_code, platform, app_version, details)
                 ${where} ORDER BY at DESC, id DESC LIMIT ${cap})`,
      )
      .join(' UNION ALL ');
    const rows: Record<string, unknown>[] = await this.dataSource.query(
      `SELECT f.*, u.name AS user_name, u.mobile_number AS user_mobile, u.role AS user_role_name, pv.brand_name
         FROM (${union}) f
         LEFT JOIN users u ON u.id = f.user_id
         LEFT JOIN providers pv ON pv.id = f.provider_id
        ORDER BY f.at DESC, f.id DESC LIMIT ${cap}`,
      params,
    );
    const page = rows.slice(0, limit);
    const last = page[page.length - 1];
    return {
      items: page.map((r) => ({
        id: r.id,
        at: r.at,
        source: r.source,
        level: r.level,
        event: r.event,
        message: r.message,
        userId: r.user_id,
        userName: r.user_name ?? null,
        userMobile: r.user_mobile ?? null,
        userRole: r.user_role_name ?? null,
        providerId: r.provider_id,
        businessName: r.brand_name ?? null,
        entityType: r.entity_type,
        entityId: r.entity_id,
        sessionId: r.session_id,
        requestId: r.request_id,
        path: r.path,
        statusCode: r.status_code,
        platform: r.platform,
        appVersion: r.app_version,
        details: r.details,
      })),
      nextCursor:
        rows.length > limit && last
          ? `${new Date(last.at as string).toISOString()}|${String(last.id)}`
          : null,
      from,
      to,
    };
  }

  /** How many of each source and level the filters match (for the chips). */
  async counts(q: LogFeedQueryDto) {
    // Counts ignore the source/level choice itself, so every chip shows its number.
    const { params, conds, chosen } = await this.buildFilters(
      { ...q, sources: undefined, levels: undefined },
      false,
    );
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    if (!chosen.length) return { bySource: {}, byLevel: {} };
    const union = chosen
      .map(
        (
          b,
        ) => `(SELECT source, level FROM (${b.sql}) AS b(id, at, source, level, event, message, user_id, provider_id, entity_type,
                  entity_id, session_id, request_id, path, status_code, platform, app_version, details) ${where})`,
      )
      .join(' UNION ALL ');
    const rows: { source: string; level: string; n: number }[] =
      await this.dataSource.query(
        `SELECT source, level, COUNT(*)::int AS n FROM (${union}) c GROUP BY 1, 2`,
        params,
      );
    const bySource: Record<string, number> = {};
    const byLevel: Record<string, number> = {};
    for (const r of rows) {
      bySource[r.source] = (bySource[r.source] ?? 0) + r.n;
      byLevel[r.level] = (byLevel[r.level] ?? 0) + r.n;
    }
    return { bySource, byLevel };
  }

  // ─── Housekeeping ─────────────────────────────────────────────────────

  /** Keep the table small: info for 30 days, warnings and errors for 90. */
  @Cron('40 22 * * *') // 04:10 IST
  async prune() {
    try {
      for (let round = 0; round < 50; round++) {
        const res: unknown[] = await this.dataSource.query(
          `DELETE FROM system_logs WHERE id IN (
             SELECT id FROM system_logs
              WHERE (level = 'info' AND created_at < now() - interval '30 days') OR created_at < now() - interval '90 days'
              LIMIT 5000) RETURNING id`,
        );
        if (res.length < 5000) break;
      }
    } catch (err) {
      this.logger.warn(`Log pruning failed: ${(err as Error).message}`);
    }
  }

  /**
   * The timeline reads these tables newest-first by time. Indexes are built
   * once, CONCURRENTLY (so writes carry on), a while after start-up; a
   * migration can't, as migrations share one transaction.
   */
  onApplicationBootstrap() {
    if (process.env.NODE_ENV === 'test') return;
    setTimeout(() => void this.ensureIndexes(), 90_000).unref?.();
  }

  private async ensureIndexes() {
    const tables = [
      'provider_analytics_events',
      'search_logs',
      'notifications',
      'audit_logs',
      'whatsapp_messages',
      'payments',
      'reports',
      'bug_reports',
      'users',
      'providers',
    ];
    for (const t of tables) {
      try {
        await this.dataSource.query(
          `CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_${t}_created_at_logs" ON "${t}" ("created_at")`,
        );
      } catch (err) {
        this.logger.warn(
          `Index on ${t}.created_at not built: ${(err as Error).message}`,
        );
      }
    }
  }
}
