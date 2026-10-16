import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { Provider } from '../entities/provider.entity';
import { ReviewIntent } from '../entities/review-intent.entity';
import { User } from '../entities/user.entity';
import { toE164 } from '../whatsapp/whatsapp-phone.util';

/** A review started on the web is offered in the app for this long. */
const KEEP_DAYS = 7;

/**
 * Review links (tijarahapp.in/r?b=<business>): an owner shares one with their
 * customers. Reviews are written in the app. Someone without the app can pick
 * stars and give their number on the web page; when they sign in with that
 * number, the app opens the review with their stars filled in.
 */
@Injectable()
export class ReviewLinksService {
  constructor(
    @InjectRepository(ReviewIntent)
    private readonly intents: Repository<ReviewIntent>,
    @InjectRepository(Provider)
    private readonly providers: Repository<Provider>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async startOnWeb(dto: { phone: string; providerId: string; stars?: number }) {
    const phone = toE164(dto.phone);
    if (!phone) throw new BadRequestException('Enter a valid mobile number');
    const provider = await this.providers.findOne({
      where: { id: dto.providerId, deletedAt: IsNull() },
      select: ['id'],
    });
    if (!provider) throw new NotFoundException('Business not found');
    await this.intents.save(
      this.intents.create({
        phone,
        providerId: provider.id,
        stars: dto.stars ?? null,
      }),
    );
    return { ok: true };
  }

  /** After sign-in: a review they started on the web, if any (used once). */
  async takeMine(
    userId: string,
  ): Promise<{ providerId: string; stars: number | null } | null> {
    const user = await this.users.findOne({
      where: { id: userId },
      select: ['id', 'mobileNumber'],
    });
    const phone = toE164(user?.mobileNumber);
    if (!phone) return null;
    const intent = await this.intents.findOne({
      where: {
        phone,
        consumedAt: IsNull(),
        createdAt: MoreThan(new Date(Date.now() - KEEP_DAYS * 86_400_000)),
      },
      order: { createdAt: 'DESC' },
    });
    if (!intent) return null;
    await this.intents.update({ id: intent.id }, { consumedAt: new Date() });
    return { providerId: intent.providerId, stars: intent.stars };
  }
}
