import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';
import { Provider } from '../entities/provider.entity';
import { User } from '../entities/user.entity';
import { Verification } from '../entities/verification.entity';
import {
  WomenLedRequest,
  WomenLedRequestSource,
  WomenLedRequestStatus,
  WomenLedRole,
} from '../entities/women-led-request.entity';
import { StorageService } from '../storage/storage.service';
import { NotificationDispatchService } from '../notifications/notification-dispatch.service';
import { AutomationsService } from '../automations/automations.service';

/** What the owner's card shows. */
export type WomenLedState =
  | 'off'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'revoked';

export const WOMEN_LED_ROLES: WomenLedRole[] = ['owner', 'co_owner', 'runs_it'];
export const ROLE_LABEL: Record<WomenLedRole, string> = {
  owner: 'Owner',
  co_owner: 'Co-owner',
  runs_it: 'Runs it day to day',
};

const EVIDENCE_TYPES = /^(image\/(jpeg|png|webp|heic|heif)|application\/pdf)$/;
const EVIDENCE_MAX_BYTES = 10 * 1024 * 1024;

type Actor = { id: string; name?: string | null };

/**
 * The Women-Led badge, end to end. A business is women-led only while a
 * request is approved and not ended; women_led_status and is_women_led on
 * the provider always follow from that here — nothing else writes them.
 *
 * Owners ask (naming the woman and her role, optionally with proof), can
 * withdraw while it waits, and can turn it off at any time. Turning it on
 * again is a new request: the team checks every one against the ID she
 * already gave for verification, and can revoke with a reason.
 */
@Injectable()
export class WomenLedService {
  private readonly logger = new Logger(WomenLedService.name);

  constructor(
    @InjectRepository(WomenLedRequest)
    private readonly requests: Repository<WomenLedRequest>,
    @InjectRepository(Provider)
    private readonly providers: Repository<Provider>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Verification)
    private readonly verifications: Repository<Verification>,
    @InjectRepository(AuditLog)
    private readonly auditLogs: Repository<AuditLog>,
    private readonly dataSource: DataSource,
    private readonly storage: StorageService,
    private readonly notifications: NotificationDispatchService,
    private readonly automations: AutomationsService,
  ) {}

  // ── Shared ────────────────────────────────────────────────────────────────

  private latest(providerId: string): Promise<WomenLedRequest | null> {
    return this.requests.findOne({
      where: { providerId },
      order: { createdAt: 'DESC' },
    });
  }

  /** The owner card's state, from the latest request. */
  private stateOf(r: WomenLedRequest | null): WomenLedState {
    if (!r) return 'off';
    if (r.status === 'pending') return 'pending';
    if (r.status === 'approved') return 'approved';
    if (r.status === 'rejected') return 'rejected';
    if (r.status === 'ended' && r.endedReason === 'revoked') return 'revoked';
    return 'off';
  }

  /** Make the provider's flags match a request's outcome. */
  private async apply(
    providerId: string,
    status: 'none' | 'pending' | 'approved' | 'rejected',
    reviewer?: Actor,
  ): Promise<void> {
    await this.providers.update(providerId, {
      womenLedStatus: status,
      isWomenLed: status === 'approved',
      ...(reviewer
        ? { womenLedReviewedAt: new Date(), womenLedReviewedBy: reviewer.id }
        : {}),
    });
  }

  private async audit(
    actorId: string | null,
    action: string,
    providerId: string,
    previous: Record<string, unknown> | null,
    next: Record<string, unknown> | null,
    description: string,
  ): Promise<void> {
    if (!actorId) return;
    await this.auditLogs
      .save(
        this.auditLogs.create({
          adminId: actorId,
          action,
          entityType: 'provider',
          entityId: providerId,
          previousState: previous,
          newState: next,
          description,
        }),
      )
      .catch((err: Error) =>
        this.logger.warn(`Audit log failed (${action}): ${err.message}`),
      );
  }

  private notify(provider: Provider, title: string, body: string): void {
    this.notifications
      .sendToUser(
        provider.userId,
        'provider_status',
        title,
        body,
        { route: '/provider-details', params: { id: provider.id } },
        undefined,
        undefined,
        'provider',
      )
      .catch(() => {});
  }

  private async setting(key: string, fallback: number): Promise<number> {
    const [row] = await this.dataSource
      .query<
        { value: string }[]
      >(`SELECT value FROM system_settings WHERE key = $1`, [key])
      .catch(() => [] as { value: string }[]);
    const n = parseInt(row?.value ?? '', 10);
    return Number.isFinite(n) ? n : fallback;
  }

  /** What the badge gives, from the live settings. */
  async perks() {
    const [freeLeads, normalFreeLeads, freeDeals, normalFreeDeals] =
      await Promise.all([
        this.setting('women_led_free_leads_per_month', 8),
        this.setting('free_lead_quota_monthly', 5),
        this.setting('women_led_free_deals_lifetime', 5),
        this.setting('free_deal_quota_lifetime', 3),
      ]);
    return { freeLeads, normalFreeLeads, freeDeals, normalFreeDeals };
  }

  // ── Owner ─────────────────────────────────────────────────────────────────

  private async ownProvider(userId: string): Promise<Provider> {
    const provider = await this.providers.findOne({
      where: { userId, deletedAt: IsNull() },
    });
    if (!provider) throw new NotFoundException('You have no business yet');
    return provider;
  }

  /** The owner's card: state, the latest request, and what the badge gives. */
  async mine(userId: string) {
    const provider = await this.ownProvider(userId);
    const [r, owner, perks] = await Promise.all([
      this.latest(provider.id),
      this.users.findOne({ where: { id: userId } }),
      this.perks(),
    ]);
    return {
      state: this.stateOf(r),
      request: r
        ? {
            id: r.id,
            womanName: r.womanName,
            role: r.role,
            note: r.note,
            hasProof: !!r.evidenceKey,
            requestedAt: r.createdAt,
            decidedAt: r.decidedAt,
            // A reason is only shown when it wasn't approved or was removed.
            reason:
              r.status === 'rejected'
                ? r.decisionNote
                : r.endedReason === 'revoked'
                  ? r.endNote
                  : null,
            endedAt: r.endedAt,
          }
        : null,
      ownerName: owner?.name?.trim() || '',
      perks,
    };
  }

  /** Optional proof, stored privately: only admins can open it. */
  async uploadEvidence(userId: string, file: Express.Multer.File | undefined) {
    if (!file) throw new BadRequestException('Choose a photo or PDF');
    if (!EVIDENCE_TYPES.test(file.mimetype)) {
      throw new BadRequestException('Use a photo (JPG, PNG) or a PDF');
    }
    if (file.size > EVIDENCE_MAX_BYTES) {
      throw new BadRequestException('The file must be under 10 MB');
    }
    const provider = await this.ownProvider(userId);
    const ext =
      file.mimetype === 'application/pdf'
        ? 'pdf'
        : (file.mimetype.split('/')[1] ?? 'jpg').replace('jpeg', 'jpg');
    const key = await this.storage.putPrivate(
      `women-led/${provider.id}`,
      file.buffer,
      file.mimetype,
      ext,
    );
    return {
      evidenceKey: key,
      name: (file.originalname || `proof.${ext}`).slice(0, 150),
      type: file.mimetype,
    };
  }

  async request(
    userId: string,
    dto: {
      womanName: string;
      role: WomenLedRole;
      confirm: boolean;
      note?: string;
      evidenceKey?: string;
      evidenceName?: string;
      evidenceType?: string;
    },
  ) {
    if (!dto.confirm) {
      throw new BadRequestException('Please confirm the details are true');
    }
    const provider = await this.ownProvider(userId);
    const current = this.stateOf(await this.latest(provider.id));
    if (current === 'approved')
      throw new ConflictException('Your business is already Women-Led');
    if (current === 'pending')
      throw new ConflictException('Your request is already being checked');
    // Proof must be one this business uploaded.
    if (
      dto.evidenceKey &&
      !dto.evidenceKey.startsWith(`women-led/${provider.id}/`)
    ) {
      throw new BadRequestException('Upload the proof again');
    }
    const saved = await this.requests.save(
      this.requests.create({
        providerId: provider.id,
        source: 'owner',
        requestedBy: userId,
        womanName: dto.womanName.trim(),
        role: dto.role,
        note: dto.note?.trim() || null,
        evidenceKey: dto.evidenceKey ?? null,
        evidenceName: dto.evidenceKey ? (dto.evidenceName ?? null) : null,
        evidenceType: dto.evidenceKey ? (dto.evidenceType ?? null) : null,
        status: 'pending',
      }),
    );
    await this.apply(provider.id, 'pending');
    await this.audit(
      userId,
      'women_led_requested',
      provider.id,
      { state: current },
      { requestId: saved.id, womanName: saved.womanName, role: saved.role },
      'Owner asked for the Women-Led badge',
    );
    return this.mine(userId);
  }

  async withdraw(userId: string) {
    const provider = await this.ownProvider(userId);
    const r = await this.latest(provider.id);
    if (!r || r.status !== 'pending')
      throw new ConflictException('There is no request waiting');
    r.status = 'withdrawn';
    r.endedAt = new Date();
    r.endedBy = userId;
    await this.requests.save(r);
    await this.apply(provider.id, 'none');
    await this.audit(
      userId,
      'women_led_withdrawn',
      provider.id,
      { state: 'pending' },
      { state: 'off' },
      'Owner withdrew the Women-Led request',
    );
    return this.mine(userId);
  }

  /** The badge goes straight away; asking again is a new request. */
  async turnOff(userId: string, note?: string) {
    const provider = await this.ownProvider(userId);
    const r = await this.latest(provider.id);
    if (!r || r.status !== 'approved')
      throw new ConflictException('Your business is not Women-Led');
    r.status = 'ended';
    r.endedAt = new Date();
    r.endedBy = userId;
    r.endedReason = 'turned_off';
    r.endNote = note?.trim() || null;
    await this.requests.save(r);
    await this.apply(provider.id, 'none');
    await this.audit(
      userId,
      'women_led_turned_off',
      provider.id,
      { state: 'approved' },
      { state: 'off', note: r.endNote },
      'Owner turned off Women-Led',
    );
    return this.mine(userId);
  }

  /**
   * At sign-up the owner said a woman owns or runs it (naming her and her
   * role, and confirming): the team checks it like any request. Older app
   * builds send only the yes, so the account holder's name stands in.
   */
  async requestFromOnboarding(
    providerId: string,
    userId: string,
    details: { womanName?: string; role?: WomenLedRole } = {},
  ) {
    const exists = await this.requests.count({ where: { providerId } });
    if (exists) return;
    const owner = await this.users.findOne({ where: { id: userId } });
    await this.requests.save(
      this.requests.create({
        providerId,
        source: 'onboarding',
        requestedBy: userId,
        womanName: details.womanName?.trim() || owner?.name?.trim() || 'Owner',
        role: details.role ?? 'owner',
        status: 'pending',
      }),
    );
    await this.apply(providerId, 'pending');
  }

  /**
   * The owner tapped "Yes, it's women-led" on WhatsApp: a request for the
   * team, unless one is already waiting or approved. Returns what happened.
   */
  async requestFromWhatsApp(
    providerId: string,
  ): Promise<
    'requested' | 'already_pending' | 'already_approved' | 'no_business'
  > {
    const provider = await this.providers.findOne({
      where: { id: providerId, deletedAt: IsNull() },
    });
    if (!provider) return 'no_business';
    const state = this.stateOf(await this.latest(providerId));
    if (state === 'pending') return 'already_pending';
    if (state === 'approved') return 'already_approved';
    const owner = await this.users.findOne({ where: { id: provider.userId } });
    await this.requests.save(
      this.requests.create({
        providerId,
        source: 'owner',
        requestedBy: provider.userId,
        womanName: owner?.name?.trim() || provider.brandName,
        role: 'owner',
        note: 'Said "Yes, it\'s women-led" on WhatsApp',
        status: 'pending',
      }),
    );
    await this.apply(providerId, 'pending');
    return 'requested';
  }

  // ── Team ──────────────────────────────────────────────────────────────────

  private async adminName(adminId: string): Promise<string> {
    const a = await this.users.findOne({
      where: { id: adminId },
      select: ['id', 'name'],
    });
    return a?.name?.trim() || 'an admin';
  }

  /**
   * Safety net: a business marked pending with no request (listed through a
   * server still on older code, which shares this database) gets one, so it
   * shows in the review queue. Cheap; runs before each list.
   */
  private async adoptOrphans(): Promise<void> {
    await this.dataSource
      .query(
        `INSERT INTO women_led_requests (provider_id, created_at, source, requested_by, woman_name, role, status)
         SELECT p.id, p.created_at, 'onboarding', p.user_id,
                LEFT(COALESCE(NULLIF(TRIM(u.name), ''), p.brand_name), 100), 'owner', 'pending'
           FROM providers p
           LEFT JOIN users u ON u.id = p.user_id
          WHERE p.women_led_status = 'pending' AND p.deleted_at IS NULL
            AND NOT EXISTS (SELECT 1 FROM women_led_requests r WHERE r.provider_id = p.id AND r.status = 'pending')
         ON CONFLICT DO NOTHING`,
      )
      .catch((err: Error) =>
        this.logger.warn(`Women-led orphan check failed: ${err.message}`),
      );
    // Older code also shows the badge while pending: keep the flag honest.
    await this.dataSource
      .query(
        `UPDATE providers SET is_women_led = false
          WHERE is_women_led = true AND women_led_status = 'pending'`,
      )
      .catch(() => undefined);
  }

  /** The review queue and the lists, newest first. */
  async list(opts: {
    tab: 'pending' | 'approved' | 'not_approved' | 'all';
    page?: number;
    limit?: number;
    search?: string;
  }) {
    await this.adoptOrphans();
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 25));
    const where: string[] = [];
    const params: unknown[] = [];
    // One row per business: its latest request.
    if (opts.tab === 'pending') where.push(`r.status = 'pending'`);
    else if (opts.tab === 'approved') where.push(`r.status = 'approved'`);
    else if (opts.tab === 'not_approved')
      where.push(
        `(r.status = 'rejected' OR (r.status = 'ended' AND r.ended_reason = 'revoked'))`,
      );
    if (opts.search?.trim()) {
      params.push(`%${opts.search.trim()}%`);
      where.push(
        `(p.brand_name ILIKE $${params.length} OR r.woman_name ILIKE $${params.length} OR u.mobile_number ILIKE $${params.length})`,
      );
    }
    const base = `
      FROM (SELECT DISTINCT ON (provider_id) * FROM women_led_requests ORDER BY provider_id, created_at DESC) r
      JOIN providers p ON p.id = r.provider_id AND p.deleted_at IS NULL
      LEFT JOIN users u ON u.id = p.user_id
      LEFT JOIN verifications v ON v.user_id = p.user_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}`;
    const [rows, [{ n }], counts] = await Promise.all([
      this.dataSource.query<Record<string, unknown>[]>(
        `SELECT r.id, r.status, r.source, r.woman_name, r.role, r.note, r.created_at, r.decided_at,
                r.decision_note, r.ended_at, r.ended_reason, r.end_note, (r.evidence_key IS NOT NULL) AS has_proof,
                p.id AS provider_id, p.brand_name, p.slug, p.city, p.area, p.status AS provider_status,
                u.name AS owner_name, u.mobile_number AS owner_phone, u.gender AS owner_gender,
                v.aadhaar_status, v.status AS verification_status
           ${base}
          ORDER BY r.created_at DESC
          LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
        params,
      ),
      this.dataSource.query<{ n: string }[]>(
        `SELECT count(*) AS n ${base}`,
        params,
      ),
      this.dataSource.query<{ tab: string; n: string }[]>(
        `SELECT CASE WHEN r.status = 'pending' THEN 'pending'
                     WHEN r.status = 'approved' THEN 'approved'
                     WHEN r.status = 'rejected' OR (r.status = 'ended' AND r.ended_reason = 'revoked') THEN 'not_approved'
                     ELSE 'off' END AS tab, count(*) AS n
           FROM (SELECT DISTINCT ON (provider_id) * FROM women_led_requests ORDER BY provider_id, created_at DESC) r
           JOIN providers p ON p.id = r.provider_id AND p.deleted_at IS NULL
          GROUP BY 1`,
      ),
    ]);
    const count = (t: string) =>
      Number(counts.find((c) => c.tab === t)?.n ?? 0);
    return {
      items: rows.map((r) => ({
        id: r.id,
        status: r.status,
        source: r.source,
        womanName: r.woman_name,
        role: r.role,
        note: r.note,
        requestedAt: r.created_at,
        decidedAt: r.decided_at,
        decisionNote: r.decision_note,
        endedAt: r.ended_at,
        endedReason: r.ended_reason,
        endNote: r.end_note,
        hasProof: r.has_proof,
        provider: {
          id: r.provider_id,
          brandName: r.brand_name,
          slug: r.slug,
          city: r.city,
          area: r.area,
          status: r.provider_status,
        },
        owner: {
          name: r.owner_name,
          phone: r.owner_phone,
          gender: r.owner_gender,
        },
        idCheck: {
          aadhaarStatus: r.aadhaar_status ?? null,
          verificationStatus: r.verification_status ?? null,
        },
      })),
      total: Number(n),
      page,
      limit,
      counts: {
        pending: count('pending'),
        approved: count('approved'),
        notApproved: count('not_approved'),
      },
    };
  }

  /** Everything needed to decide: the request, the owner, her ID, the history. */
  async detail(id: string) {
    const r = await this.requests.findOne({ where: { id } });
    if (!r) throw new NotFoundException('Request not found');
    const provider = await this.providers.findOne({
      where: { id: r.providerId },
    });
    if (!provider) throw new NotFoundException('Business not found');
    const [owner, verification, history] = await Promise.all([
      this.users.findOne({ where: { id: provider.userId } }),
      this.verifications.findOne({ where: { userId: provider.userId } }),
      this.requests.find({
        where: { providerId: provider.id },
        order: { createdAt: 'DESC' },
      }),
    ]);
    const actorIds = [
      ...new Set(
        history
          .flatMap((h) => [h.decidedBy, h.endedBy, h.requestedBy])
          .filter((x): x is string => !!x),
      ),
    ];
    const actors = actorIds.length
      ? await this.users.find({
          where: { id: In(actorIds) },
          select: ['id', 'name'],
        })
      : [];
    const nameOf = (uid: string | null) =>
      (uid && actors.find((a) => a.id === uid)?.name) || null;
    return {
      request: {
        ...r,
        evidenceKey: undefined,
        hasProof: !!r.evidenceKey,
      },
      provider: {
        id: provider.id,
        brandName: provider.brandName,
        slug: provider.slug,
        city: provider.city,
        area: provider.area,
        status: provider.status,
        contactNumber: provider.contactNumber,
        profilePhotoUrl: provider.profilePhotoUrl,
        womenLedStatus: provider.womenLedStatus,
      },
      owner: owner
        ? {
            id: owner.id,
            name: owner.name,
            phone: owner.mobileNumber,
            gender: owner.gender,
          }
        : null,
      idCheck: verification
        ? {
            status: verification.status,
            aadhaarStatus: verification.aadhaarStatus,
            aadhaarDocUrl: verification.aadhaarDocUrl,
            ijamatStatus: verification.ijamatStatus,
            ijamatDocUrl: verification.ijamatDocUrl,
            reviewerName: verification.reviewerName,
          }
        : null,
      history: history.map((h) => ({
        id: h.id,
        status: h.status,
        source: h.source,
        womanName: h.womanName,
        role: h.role,
        requestedAt: h.createdAt,
        requestedBy: nameOf(h.requestedBy),
        decidedAt: h.decidedAt,
        decidedBy: nameOf(h.decidedBy),
        decisionNote: h.decisionNote,
        endedAt: h.endedAt,
        endedBy: nameOf(h.endedBy),
        endedReason: h.endedReason,
        endNote: h.endNote,
      })),
    };
  }

  /** The proof file, for an admin to open. */
  async evidence(id: string) {
    const r = await this.requests.findOne({ where: { id } });
    if (!r?.evidenceKey) throw new NotFoundException('No proof was attached');
    const data = await this.storage.get(r.evidenceKey);
    return {
      data,
      type: r.evidenceType || 'application/octet-stream',
      name: r.evidenceName || 'proof',
    };
  }

  private async pendingRequest(id: string) {
    const r = await this.requests.findOne({ where: { id } });
    if (!r) throw new NotFoundException('Request not found');
    if (r.status !== 'pending')
      throw new ConflictException(`This request is already ${r.status}`);
    const provider = await this.providers.findOne({
      where: { id: r.providerId },
    });
    if (!provider) throw new NotFoundException('Business not found');
    return { r, provider };
  }

  async approve(admin: Actor, id: string, note?: string) {
    const { r, provider } = await this.pendingRequest(id);
    r.status = 'approved';
    r.decidedAt = new Date();
    r.decidedBy = admin.id;
    r.decisionNote = note?.trim() || null;
    await this.requests.save(r);
    await this.apply(provider.id, 'approved', admin);
    await this.audit(
      admin.id,
      'women_led_approved',
      provider.id,
      { womenLedStatus: provider.womenLedStatus },
      { womenLedStatus: 'approved', requestId: r.id, note: r.decisionNote },
      'Women-Led approved',
    );
    await this.afterApproved(provider);
    return this.detail(r.id);
  }

  private async afterApproved(provider: Provider) {
    const { freeLeads } = await this.perks();
    this.notify(
      provider,
      'Women-Led badge approved',
      `${provider.brandName} now shows the Women-Led badge, appears in the Women-Led section and gets ${freeLeads} free lead unlocks a month.`,
    );
    void this.automations
      .schedule('women_led_approved', {
        dedupeKey: `women_led_approved:${provider.id}:${Date.now()}`,
        providerId: provider.id,
        context: { freeLeads },
      })
      .catch(() => {});
  }

  async reject(admin: Actor, id: string, reason: string) {
    if (!reason?.trim()) throw new BadRequestException('Give a reason');
    const { r, provider } = await this.pendingRequest(id);
    r.status = 'rejected';
    r.decidedAt = new Date();
    r.decidedBy = admin.id;
    r.decisionNote = reason.trim();
    await this.requests.save(r);
    await this.apply(provider.id, 'rejected', admin);
    await this.audit(
      admin.id,
      'women_led_rejected',
      provider.id,
      { womenLedStatus: provider.womenLedStatus },
      { womenLedStatus: 'rejected', requestId: r.id, reason: r.decisionNote },
      'Women-Led not approved',
    );
    this.notify(
      provider,
      'Women-Led request not approved',
      `We couldn't add the Women-Led badge to ${provider.brandName}: ${r.decisionNote} You can update your details and ask again.`,
    );
    void this.automations
      .schedule('women_led_not_approved', {
        dedupeKey: `women_led_not_approved:${r.id}`,
        providerId: provider.id,
        context: { reason: r.decisionNote },
      })
      .catch(() => {});
    return this.detail(r.id);
  }

  /** Take an approved badge away, with a reason the owner sees. */
  async revoke(admin: Actor, providerId: string, reason: string) {
    if (!reason?.trim()) throw new BadRequestException('Give a reason');
    const provider = await this.providers.findOne({
      where: { id: providerId },
    });
    if (!provider) throw new NotFoundException('Business not found');
    const r = await this.latest(providerId);
    if (!r || r.status !== 'approved')
      throw new ConflictException('This business is not Women-Led');
    r.status = 'ended';
    r.endedAt = new Date();
    r.endedBy = admin.id;
    r.endedReason = 'revoked';
    r.endNote = reason.trim();
    await this.requests.save(r);
    await this.apply(providerId, 'rejected', admin);
    await this.audit(
      admin.id,
      'women_led_revoked',
      providerId,
      { womenLedStatus: 'approved' },
      { womenLedStatus: 'rejected', reason: r.endNote },
      'Women-Led removed by the team',
    );
    this.notify(
      provider,
      'Women-Led badge removed',
      `The Women-Led badge was removed from ${provider.brandName}: ${r.endNote} Contact us if you think this is a mistake.`,
    );
    return this.detail(r.id);
  }

  /**
   * The team confirmed it themselves (in person, by phone, or a bulk import
   * column saying yes). Recorded as verified by that admin.
   */
  async grant(
    admin: Actor,
    providerId: string,
    opts: {
      womanName?: string;
      role?: WomenLedRole;
      note?: string;
      source?: Extract<WomenLedRequestSource, 'admin' | 'import'>;
      quiet?: boolean;
    } = {},
  ) {
    const provider = await this.providers.findOne({
      where: { id: providerId },
    });
    if (!provider) throw new NotFoundException('Business not found');
    const r = await this.latest(providerId);
    if (r?.status === 'approved') return this.detail(r.id);
    if (r?.status === 'pending') {
      return this.approve(
        admin,
        r.id,
        opts.note || `Confirmed by ${await this.adminName(admin.id)}`,
      );
    }
    const owner = await this.users.findOne({ where: { id: provider.userId } });
    const saved = await this.requests.save(
      this.requests.create({
        providerId,
        source: opts.source ?? 'admin',
        requestedBy: admin.id,
        womanName:
          opts.womanName?.trim() || owner?.name?.trim() || provider.brandName,
        role: opts.role ?? 'owner',
        status: 'approved',
        decidedAt: new Date(),
        decidedBy: admin.id,
        decisionNote:
          opts.note?.trim() || `Verified by ${await this.adminName(admin.id)}`,
      }),
    );
    await this.apply(providerId, 'approved', admin);
    await this.audit(
      admin.id,
      'women_led_granted',
      providerId,
      { womenLedStatus: provider.womenLedStatus },
      { womenLedStatus: 'approved', requestId: saved.id, source: saved.source },
      'Women-Led marked verified by the team',
    );
    if (!opts.quiet) await this.afterApproved(provider);
    return this.detail(saved.id);
  }

  /** For the old approve/reject endpoints, which work on a business. */
  async decideForProvider(
    admin: Actor,
    providerId: string,
    decision: 'approved' | 'rejected',
    reason?: string,
  ) {
    const r = await this.latest(providerId);
    if (r?.status === 'pending') {
      return decision === 'approved'
        ? this.approve(admin, r.id)
        : this.reject(admin, r.id, reason || 'It could not be confirmed.');
    }
    if (decision === 'approved') return this.grant(admin, providerId);
    return this.revoke(
      admin,
      providerId,
      reason || 'It could not be confirmed.',
    );
  }

  /** Requests by state, for a business (used by ProviderView). */
  async forProvider(providerId: string) {
    const r = await this.latest(providerId);
    return {
      state: this.stateOf(r),
      requestId: r?.id ?? null,
      womanName: r?.womanName ?? null,
      role: r?.role ?? null,
    };
  }

  /** Counts per state, for analytics and the attention badge. */
  statusCounts(): Promise<{ status: WomenLedRequestStatus; n: number }[]> {
    return this.dataSource.query(
      `SELECT status, count(*)::int AS n FROM women_led_requests GROUP BY 1`,
    );
  }
}
