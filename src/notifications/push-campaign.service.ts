import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { NotificationBatch } from '../entities/notification-batch.entity';
import { NotificationType } from '../entities/notification.entity';
import { NotificationDispatchService } from './notification-dispatch.service';
import {
  PushAudience,
  PushAudienceService,
  PushRecipient,
} from './push-audience.service';

export interface CampaignInput {
  title: string;
  body: string;
  imageUrl?: string;
  /** App screen to open, e.g. "/deals?mode=customer" or "/?tab=analytics&mode=provider". */
  route?: string;
  type?: 'promotional' | 'system_announcement';
  audience: PushAudience;
  /** ISO time to send at; omitted or past = now. */
  scheduledAt?: string;
  templateId?: string;
}

const CHUNK = 50;

/** {{name}} is the first name; a variable with no value disappears cleanly. */
export function personalise(
  text: string,
  r: Pick<PushRecipient, 'name' | 'city' | 'businessName'> | null,
): string {
  const vars: Record<string, string> = {
    name: (r?.name ?? '').trim().split(/\s+/)[0] ?? '',
    city: r?.city?.trim() ?? '',
    businessName: r?.businessName?.trim() ?? '',
  };
  return text
    .replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) => vars[k] ?? '')
    .replace(/[ \t]+([,.!?])/g, '$1')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/** The recipient's own business for owner screens; a customer sent an owner screen lands on Home. */
export function routeFor(
  route: string | undefined,
  r: Pick<PushRecipient, 'providerId'> | null,
): string | undefined {
  if (!route) return undefined;
  const ownerScreen =
    route.includes('{provider_id}') || /[?&]mode=provider\b/.test(route);
  if (ownerScreen && !r?.providerId) return '/';
  return r?.providerId
    ? route.replace(/\{provider_id\}/g, r.providerId)
    : route;
}

/**
 * Admin push campaigns: one batch row per campaign, sent now or at a set time
 * by the scheduler. Sending happens in the background; the batch's counters
 * fill in as it goes, so the admin can watch it.
 */
@Injectable()
export class PushCampaignService {
  private readonly logger = new Logger(PushCampaignService.name);

  constructor(
    @InjectRepository(NotificationBatch)
    private readonly batchRepo: Repository<NotificationBatch>,
    private readonly dataSource: DataSource,
    private readonly audience: PushAudienceService,
    private readonly dispatch: NotificationDispatchService,
  ) {}

  async create(
    adminId: string,
    input: CampaignInput,
  ): Promise<NotificationBatch> {
    const at = input.scheduledAt ? new Date(input.scheduledAt) : null;
    if (at && Number.isNaN(at.getTime()))
      throw new BadRequestException('That send time is not a valid date');
    const later = !!at && at.getTime() > Date.now() + 60_000;
    const a = input.audience;
    const batch = await this.batchRepo.save(
      this.batchRepo.create({
        title: input.title.trim(),
        body: input.body.trim(),
        imageUrl: input.imageUrl?.trim() || null,
        data: {
          campaign: true,
          type: input.type ?? 'promotional',
          route: input.route?.trim() || null,
          templateId: input.templateId ?? null,
        },
        targetType:
          a.kind === 'people'
            ? 'individual'
            : a.kind === 'everyone' && !this.narrowed(a)
              ? 'all'
              : 'segment',
        targetCriteria: { audience: a },
        sentBy: adminId,
        status: 'draft',
        // Immediate sends get "now" too, so the scheduler picks them up if this process dies first.
        scheduledAt: later ? at : new Date(),
      }),
    );
    if (!later) {
      void this.run(batch.id).catch((e) =>
        this.logger.error(`Campaign ${batch.id} failed: ${e.message}`),
      );
    }
    return batch;
  }

  /** Sends a draft batch. Claimed atomically, so it goes out once however many callers race. */
  async run(batchId: string): Promise<void> {
    const claimed: NotificationBatch[] = await this.batchRepo
      .createQueryBuilder()
      .update()
      .set({ status: 'sending' })
      .where('id = :id AND status = :draft', { id: batchId, draft: 'draft' })
      .returning('*')
      .execute()
      .then((r) => r.raw);
    if (!claimed.length) return;
    const batch = await this.batchRepo.findOneByOrFail({ id: batchId });

    try {
      const a = this.audienceOf(batch);
      const recipients = await this.audience.resolve(a);
      const type = ((batch.data?.type as string) ||
        'promotional') as NotificationType;
      const route = (batch.data?.route as string | null) ?? undefined;
      await this.batchRepo.update(batch.id, {
        totalRecipients: recipients.length,
      });

      const stats = { pushed: 0, inbox: 0, failed: 0 };
      for (let i = 0; i < recipients.length; i += CHUNK) {
        const chunk = recipients.slice(i, i + CHUNK);
        const results = await Promise.all(
          chunk.map((r) => {
            const link = routeFor(route, r);
            return this.dispatch.deliver(
              r.userId,
              type,
              personalise(batch.title, r),
              personalise(batch.body, r),
              link ? { route: link } : undefined,
              batch.imageUrl || undefined,
              batch.id,
              r.kind === 'business' ? 'provider' : 'customer',
            );
          }),
        );
        for (const res of results) stats[res]++;
        await this.batchRepo.update(batch.id, {
          deliveredCount: stats.pushed,
          failedCount: stats.failed,
          data: { ...batch.data, stats } as NotificationBatch['data'],
        });
      }
      await this.batchRepo.update(batch.id, {
        status: 'sent',
        sentAt: new Date(),
        deliveredCount: stats.pushed,
        failedCount: stats.failed,
        data: { ...batch.data, stats } as NotificationBatch['data'],
      });
      this.logger.log(
        `Campaign ${batch.id}: ${stats.pushed} pushed, ${stats.inbox} inbox only, ${stats.failed} failed`,
      );
    } catch (e) {
      await this.batchRepo.update(batch.id, { status: 'failed' });
      throw e;
    }
  }

  /** A scheduled campaign that hasn't started can be called off. */
  async cancel(batchId: string): Promise<{ cancelled: true }> {
    const res = await this.batchRepo.delete({ id: batchId, status: 'draft' });
    if (!res.affected) {
      const exists = await this.batchRepo.existsBy({ id: batchId });
      if (!exists) throw new NotFoundException('Campaign not found');
      throw new BadRequestException(
        "This campaign has already gone out, so it can't be cancelled",
      );
    }
    return { cancelled: true };
  }

  /** A test to one person (the admin by default), personalised as they'd see it. */
  async test(
    userId: string,
    input: {
      title: string;
      body: string;
      imageUrl?: string;
      route?: string;
      type?: string;
    },
  ): Promise<{ devices: number; delivered: number; sentTo: string }> {
    const [me] = await this.audience.resolve({
      kind: 'people',
      userIds: [userId],
    });
    const r: PushRecipient = me ?? {
      userId,
      kind: 'customer',
      name: null,
      city: null,
      providerId: null,
      businessName: null,
    };
    const link = routeFor(input.route, r);
    const result = await this.dispatch.sendTest(
      userId,
      (input.type as NotificationType) || 'promotional',
      personalise(input.title, r),
      personalise(input.body, r),
      link ? { route: link } : undefined,
      input.imageUrl || undefined,
      r.kind === 'business' ? 'provider' : 'customer',
    );
    return {
      ...result,
      sentTo: r.businessName
        ? `${r.name ?? 'Owner'} (${r.businessName})`
        : (r.name ?? 'this account'),
    };
  }

  /** The owner of a business, for "send a test to this business". */
  async ownerOf(providerId: string): Promise<string> {
    const [row] = await this.dataSource.query(
      `SELECT user_id FROM providers WHERE id = $1 AND deleted_at IS NULL`,
      [providerId],
    );
    if (!row?.user_id) throw new NotFoundException('Business not found');
    return row.user_id;
  }

  private narrowed(a: PushAudience): boolean {
    return !!(
      a.cities?.length ||
      a.categoryIds?.length ||
      a.platforms?.length ||
      a.joinedWithinDays ||
      a.activeWithinDays ||
      a.inactiveDays
    );
  }

  /** New batches carry an audience; older ones a city/role/user list. */
  private audienceOf(batch: NotificationBatch): PushAudience {
    const c = batch.targetCriteria ?? {};
    if (c.audience) return c.audience as PushAudience;
    if (batch.targetType === 'individual')
      return { kind: 'people', userIds: c.userIds ?? [] };
    return { kind: 'everyone', cities: c.city ? [c.city] : undefined };
  }
}
