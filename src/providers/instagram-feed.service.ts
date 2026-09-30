import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Provider } from '../entities/provider.entity';
import { instagramHandleOf, instagramConfigProblem } from '../admin/provider-enrichment.service';

const TIMEOUT_MS = 8_000;
const DEFAULT_API_VERSION = 'v21.0';
/** How many posts a listing shows. */
const POST_LIMIT = 5;
/**
 * Instagram's CDN links are signed and expire, so we re-ask often enough to
 * keep them alive while still answering most page views from memory.
 */
const CACHE_TTL_MS = 3 * 60 * 60 * 1000;
/** A handle with no business account will not grow one today — ask again tomorrow. */
const EMPTY_TTL_MS = 24 * 60 * 60 * 1000;

export interface InstagramPost {
  /** The image to show. For a video this is its thumbnail. */
  imageUrl: string;
  /** Where tapping the tile goes — the post on instagram.com. */
  permalink: string;
  isVideo: boolean;
  caption: string | null;
}

export interface InstagramFeed {
  handle: string | null;
  profileUrl: string | null;
  posts: InstagramPost[];
  /** Why there is nothing to show, for the logs — never shown to a customer. */
  note?: string;
}

const EMPTY: InstagramFeed = { handle: null, profileUrl: null, posts: [] };

interface CacheEntry {
  feed: InstagramFeed;
  expiresAt: number;
}

/**
 * The five most recent public posts of a business's Instagram, for their
 * listing. Read through Instagram Business Discovery — the official way to see
 * another business's public profile — so nothing is scraped.
 *
 * Only Business and Creator accounts are visible this way. A personal account
 * returns nothing, which is normal and not an error.
 */
@Injectable()
export class InstagramFeedService {
  private readonly logger = new Logger(InstagramFeedService.name);
  private readonly token?: string;
  private readonly accountId?: string;
  private readonly version: string;
  /** Set when the credentials cannot work at all, so we never call out. */
  private readonly configProblem?: string;
  private readonly cache = new Map<string, CacheEntry>();
  /** One in-flight request per handle: a popular listing must not fan out. */
  private readonly inFlight = new Map<string, Promise<InstagramFeed>>();

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(Provider) private readonly providerRepo: Repository<Provider>,
  ) {
    this.token = this.config.get<string>('INSTAGRAM_GRAPH_TOKEN') || undefined;
    this.accountId = this.config.get<string>('INSTAGRAM_BUSINESS_ACCOUNT_ID') || undefined;
    this.version = this.config.get<string>('INSTAGRAM_API_VERSION') || DEFAULT_API_VERSION;
    if (!this.token || !this.accountId) {
      this.logger.warn('Instagram posts disabled — set INSTAGRAM_GRAPH_TOKEN and INSTAGRAM_BUSINESS_ACCOUNT_ID');
    }
    this.configProblem = instagramConfigProblem(this.token, this.accountId);
    if (this.configProblem) this.logger.warn(`Instagram posts disabled — ${this.configProblem}`);
  }

  /** The feed for one provider. Never throws: an empty feed just hides the grid. */
  async forProvider(providerId: string): Promise<InstagramFeed> {
    const provider = await this.providerRepo.findOne({
      where: { id: providerId },
      select: ['id', 'instagramHandle'],
    });
    if (!provider) throw new NotFoundException('Provider not found');

    const handle = instagramHandleOf(provider.instagramHandle);
    if (!handle) return EMPTY;

    const profileUrl = `https://www.instagram.com/${handle}/`;
    const feed = await this.forHandle(handle);
    return { ...feed, handle, profileUrl };
  }

  private async forHandle(handle: string): Promise<InstagramFeed> {
    const key = handle.toLowerCase();

    const hit = this.cache.get(key);
    if (hit && hit.expiresAt > Date.now()) return hit.feed;

    const pending = this.inFlight.get(key);
    if (pending) return pending;

    const task = this.fetchPosts(handle)
      .then((feed) => {
        const ttl = feed.posts.length ? CACHE_TTL_MS : EMPTY_TTL_MS;
        this.cache.set(key, { feed, expiresAt: Date.now() + ttl });
        return feed;
      })
      .catch((err) => {
        const note = (err as Error).message;
        this.logger.warn(`Instagram posts for @${handle} failed: ${note}`);
        // Cache the failure briefly so one broken handle cannot be retried on
        // every page view, but recover well before the good-case TTL.
        this.cache.set(key, { feed: { ...EMPTY, note }, expiresAt: Date.now() + 10 * 60 * 1000 });
        return { ...EMPTY, note };
      })
      .finally(() => this.inFlight.delete(key));

    this.inFlight.set(key, task);
    return task;
  }

  private async fetchPosts(handle: string): Promise<InstagramFeed> {
    if (!this.token || !this.accountId) return { ...EMPTY, note: 'Instagram is not configured' };
    // Bad credentials fail identically for every handle — do not spend a
    // request (or a rate-limit slot) rediscovering that per provider.
    if (this.configProblem) return { ...EMPTY, note: this.configProblem };

    const url = new URL(`https://graph.facebook.com/${this.version}/${this.accountId}`);
    url.searchParams.set(
      'fields',
      `business_discovery.username(${handle}){media.limit(${POST_LIMIT})` +
        `{media_url,permalink,media_type,thumbnail_url,caption}}`,
    );
    url.searchParams.set('access_token', this.token);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, { signal: controller.signal });
      const data = (await res.json()) as {
        error?: { message?: string; code?: number };
        business_discovery?: {
          media?: {
            data?: {
              media_url?: string;
              permalink?: string;
              media_type?: string;
              thumbnail_url?: string;
              caption?: string;
            }[];
          };
        };
      };

      if (data.error) {
        // Not a business account, or the handle is gone — normal, not a failure.
        if (data.error.code === 110 || /does not exist|cannot be found/i.test(data.error.message ?? '')) {
          return { ...EMPTY, note: 'No public business account' };
        }
        // Never surface the URL — it carries the access token.
        throw new Error(data.error.message ?? `HTTP ${res.status}`);
      }

      const posts = (data.business_discovery?.media?.data ?? [])
        .map((m) => {
          const isVideo = m.media_type === 'VIDEO';
          // A video's media_url is the file itself; its thumbnail is the picture.
          const imageUrl = isVideo ? m.thumbnail_url : m.media_url;
          if (!imageUrl || !m.permalink) return null;
          return {
            imageUrl,
            permalink: m.permalink,
            isVideo,
            caption: m.caption?.trim() || null,
          } satisfies InstagramPost;
        })
        .filter((p): p is InstagramPost => p !== null)
        .slice(0, POST_LIMIT);

      return { handle, profileUrl: `https://www.instagram.com/${handle}/`, posts };
    } catch (err) {
      if (controller.signal.aborted) throw new Error('Instagram timed out');
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}
