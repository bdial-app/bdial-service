import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan, IsNull, Not, In } from 'typeorm';
import { User } from '../entities/user.entity';
import { Subscription } from '../entities/subscription.entity';
import { Voucher } from '../entities/voucher.entity';
import { SponsoredListing } from '../entities/sponsored-listing.entity';
import { NotificationDispatchService } from './notification-dispatch.service';
import { NotificationTemplateService } from './notification-template.service';

/**
 * Cron-based automated notification triggers.
 * Each job checks its corresponding template isActive before dispatching,
 * giving admin full control to disable any automated notification.
 */
@Injectable()
export class NotificationCronService {
  private readonly logger = new Logger(NotificationCronService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepo: Repository<Subscription>,
    @InjectRepository(Voucher)
    private readonly voucherRepo: Repository<Voucher>,
    @InjectRepository(SponsoredListing)
    private readonly sponsoredRepo: Repository<SponsoredListing>,
    private readonly dispatchService: NotificationDispatchService,
    private readonly templateService: NotificationTemplateService,
  ) {}

  // ─────────────────────────────────────────────────────────────
  // Daily 9 AM — Profile Completion Reminder (24h after signup)
  // ─────────────────────────────────────────────────────────────
  @Cron('0 9 * * *') // Daily at 09:00
  async profileCompletionReminder(): Promise<void> {
    if (!(await this.templateService.isEnabled('complete_profile'))) return;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dayBefore = new Date();
    dayBefore.setDate(dayBefore.getDate() - 2);

    // Users created 24-48h ago with incomplete profiles
    const users = await this.userRepo
      .createQueryBuilder('u')
      .where('u.status = :status', { status: 'active' })
      .andWhere('u.createdAt BETWEEN :start AND :end', { start: dayBefore, end: yesterday })
      .andWhere('(u.city IS NULL OR u.latitude IS NULL)')
      .select(['u.id', 'u.name'])
      .take(500) // limit per cycle
      .getMany();

    this.logger.log(`Profile completion reminder: ${users.length} users`);
    for (const user of users) {
      await this.dispatchService.sendTemplated(user.id, 'complete_profile', {
        userName: user.name || 'there',
      });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Daily 10 AM — Become a Provider CTA (7 days after signup)
  // ─────────────────────────────────────────────────────────────
  @Cron('0 10 * * *')
  async becomeProviderCta(): Promise<void> {
    if (!(await this.templateService.isEnabled('become_provider'))) return;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const eightDaysAgo = new Date();
    eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

    // Customers registered 7-8 days ago who are NOT providers
    const users = await this.userRepo
      .createQueryBuilder('u')
      .where('u.status = :status', { status: 'active' })
      .andWhere('u.role = :role', { role: 'customer' })
      .andWhere('u.createdAt BETWEEN :start AND :end', { start: eightDaysAgo, end: sevenDaysAgo })
      .select(['u.id', 'u.name'])
      .take(500)
      .getMany();

    this.logger.log(`Become provider CTA: ${users.length} users`);
    for (const user of users) {
      await this.dispatchService.sendTemplated(user.id, 'become_provider', {
        userName: user.name || 'there',
      });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Daily 8 AM — Subscription Expiring Soon (7 days before end)
  // ─────────────────────────────────────────────────────────────
  @Cron('0 8 * * *')
  async subscriptionExpiringSoon(): Promise<void> {
    if (!(await this.templateService.isEnabled('subscription_expiring'))) return;

    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const sixDaysFromNow = new Date();
    sixDaysFromNow.setDate(sixDaysFromNow.getDate() + 6);

    const subscriptions = await this.subscriptionRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.plan', 'plan')
      .where('s.status = :status', { status: 'active' })
      .andWhere('s.cancelAtPeriodEnd = :cancel', { cancel: true })
      .andWhere('s.currentPeriodEnd BETWEEN :start AND :end', {
        start: sixDaysFromNow,
        end: sevenDaysFromNow,
      })
      .getMany();

    this.logger.log(`Subscription expiring: ${subscriptions.length} subscriptions`);
    for (const sub of subscriptions) {
      await this.dispatchService.sendTemplated(sub.providerId, 'subscription_expiring', {
        planName: sub.plan?.name || 'Premium',
        daysLeft: '7',
      });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Daily 8 AM — Voucher Expiring Soon (48h before expiry)
  // ─────────────────────────────────────────────────────────────
  @Cron('0 8 * * *')
  async voucherExpiringSoon(): Promise<void> {
    if (!(await this.templateService.isEnabled('voucher_expiring'))) return;

    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
    const oneDayFromNow = new Date();
    oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);

    const vouchers = await this.voucherRepo.find({
      where: {
        isActive: true,
        validUntil: MoreThan(oneDayFromNow) && LessThan(twoDaysFromNow) as any,
      },
    });

    // For vouchers expiring, notify all active users (or segment by applicableTo)
    if (vouchers.length === 0) return;

    this.logger.log(`Voucher expiring: ${vouchers.length} vouchers`);
    for (const voucher of vouchers) {
      // Send as a segment broadcast via template
      const activeUsers = await this.userRepo
        .createQueryBuilder('u')
        .where('u.status = :status', { status: 'active' })
        .select(['u.id'])
        .take(1000)
        .getMany();

      for (const user of activeUsers) {
        await this.dispatchService.sendTemplated(user.id, 'voucher_expiring', {
          voucherCode: voucher.code,
        });
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Daily 8 AM — Sponsorship Expiring Soon (3 days before end)
  // ─────────────────────────────────────────────────────────────
  @Cron('0 8 * * *')
  async sponsorshipExpiringSoon(): Promise<void> {
    if (!(await this.templateService.isEnabled('sponsorship_expiring'))) return;

    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

    const listings = await this.sponsoredRepo
      .createQueryBuilder('s')
      .where('s.isActive = :active', { active: true })
      .andWhere('s.approvalStatus = :status', { status: 'approved' })
      .andWhere('s.endsAt BETWEEN :start AND :end', {
        start: twoDaysFromNow,
        end: threeDaysFromNow,
      })
      .getMany();

    this.logger.log(`Sponsorship expiring: ${listings.length} listings`);
    for (const listing of listings) {
      await this.dispatchService.sendTemplated(listing.providerId, 'sponsorship_expiring', {
        daysLeft: '3',
      });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Every 5 min — Auto-deactivate expired & budget-exhausted sponsorships
  // ─────────────────────────────────────────────────────────────
  @Cron('*/5 * * * *')
  async deactivateExhaustedSponsorships(): Promise<void> {
    // Deactivate listings where budget is exhausted or end date has passed
    const result = await this.sponsoredRepo
      .createQueryBuilder()
      .update(SponsoredListing)
      .set({ isActive: false })
      .where('is_active = true')
      .andWhere('(ends_at <= NOW() OR spent_amount >= budget_amount)')
      .execute();

    if (result.affected && result.affected > 0) {
      this.logger.log(`Auto-deactivated ${result.affected} sponsorships (expired/exhausted)`);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Daily 11 AM — Inactive User Re-engagement (14 days no activity)
  // ─────────────────────────────────────────────────────────────
  @Cron('0 11 * * *')
  async inactiveUserReminder(): Promise<void> {
    if (!(await this.templateService.isEnabled('inactive_reminder'))) return;

    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

    // Users whose lastSeenAt is 14-15 days ago
    const users = await this.userRepo
      .createQueryBuilder('u')
      .where('u.status = :status', { status: 'active' })
      .andWhere('u.lastSeenAt BETWEEN :start AND :end', {
        start: fifteenDaysAgo,
        end: fourteenDaysAgo,
      })
      .select(['u.id', 'u.name'])
      .take(500)
      .getMany();

    this.logger.log(`Inactive reminder: ${users.length} users`);
    for (const user of users) {
      await this.dispatchService.sendTemplated(user.id, 'inactive_reminder', {
        userName: user.name || 'there',
      });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Weekly Monday 10 AM — New Providers in Your Area
  // ─────────────────────────────────────────────────────────────
  @Cron('0 10 * * 1') // Monday at 10:00
  async newProvidersWeeklyDigest(): Promise<void> {
    if (!(await this.templateService.isEnabled('new_providers_nearby'))) return;

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Count new providers registered in the last week, grouped by city
    const newProvidersByCity = await this.userRepo
      .createQueryBuilder('u')
      .where('u.role IN (:...roles)', { roles: ['provider', 'both'] })
      .andWhere('u.status = :status', { status: 'active' })
      .andWhere('u.createdAt > :since', { since: oneWeekAgo })
      .andWhere('u.city IS NOT NULL')
      .select(['u.city AS city', 'COUNT(*) AS count'])
      .groupBy('u.city')
      .getRawMany();

    if (newProvidersByCity.length === 0) return;

    for (const { city, count } of newProvidersByCity) {
      if (parseInt(count) === 0) continue;

      // Get users in that city
      const users = await this.userRepo
        .createQueryBuilder('u')
        .where('u.status = :status', { status: 'active' })
        .andWhere('u.city = :city', { city })
        .select(['u.id'])
        .take(1000)
        .getMany();

      this.logger.log(`New providers digest: ${count} new in ${city}, notifying ${users.length} users`);
      for (const user of users) {
        await this.dispatchService.sendTemplated(user.id, 'new_providers_nearby', {
          count: String(count),
          city,
        });
      }
    }
  }
}
