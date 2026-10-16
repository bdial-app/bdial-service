import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { GoLink } from '../entities/go-link.entity';

/** How long a link opened without the app is offered after sign-in. */
const PENDING_DAYS = 7;
const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';

/**
 * Short links for messages: tijarahapp.in/go?c=<code>. The app opens the
 * screen directly when installed; otherwise the web page sends them to the
 * right store and the app opens the screen after they sign in.
 */
@Injectable()
export class GoLinksService {
  constructor(
    @InjectRepository(GoLink) private readonly repo: Repository<GoLink>,
  ) {}

  private newCode(): string {
    const bytes = randomBytes(10);
    let s = '';
    for (const b of bytes) s += ALPHABET[b % ALPHABET.length];
    return s;
  }

  /** A link to an in-app route, for one person. */
  async create(opts: {
    target: string;
    userId?: string | null;
    providerId?: string | null;
    automationKey?: string | null;
  }): Promise<GoLink> {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await this.repo.save(
          this.repo.create({
            code: this.newCode(),
            target: opts.target.slice(0, 500),
            userId: opts.userId ?? null,
            providerId: opts.providerId ?? null,
            automationKey: opts.automationKey ?? null,
          }),
        );
      } catch (err) {
        if (attempt === 2) throw err; // a code clash three times in a row: give up
      }
    }
    throw new Error('unreachable');
  }

  /** Where a code goes (public: the code is the secret). */
  async resolve(code: string): Promise<{ target: string }> {
    const link = await this.repo.findOne({ where: { code } });
    if (!link) throw new NotFoundException('This link has expired');
    return { target: link.target };
  }

  /**
   * Someone opened the link. `withoutApp` when the web page is sending them
   * to the store: the screen is then offered after they sign in.
   */
  async open(code: string, withoutApp: boolean): Promise<{ target: string }> {
    const link = await this.repo.findOne({ where: { code } });
    if (!link) throw new NotFoundException('This link has expired');
    await this.repo.update(
      { code },
      {
        openCount: () => 'open_count + 1',
        openedAt: link.openedAt ?? new Date(),
        ...(withoutApp && link.userId
          ? { pendingUntil: new Date(Date.now() + PENDING_DAYS * 86_400_000) }
          : {}),
      },
    );
    return { target: link.target };
  }

  /** After sign-in: the latest screen they tried to open without the app. */
  async takePending(userId: string): Promise<{ target: string | null }> {
    const link = await this.repo.findOne({
      where: {
        userId,
        pendingUntil: MoreThan(new Date()),
        consumedAt: IsNull(),
      },
      order: { openedAt: 'DESC' },
    });
    if (!link) return { target: null };
    await this.repo.update({ code: link.code }, { consumedAt: new Date() });
    return { target: link.target };
  }
}
