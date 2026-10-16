import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Observable } from 'rxjs';

/** Refresh at most this often per person. */
const EVERY_MS = 5 * 60_000;

/**
 * Keeps users.last_seen_at as "last used the app": any signed-in request
 * refreshes it, at most every 5 minutes, without holding up the request.
 * Messaging uses it to skip WhatsApp for people who are already in the app.
 */
@Injectable()
export class LastActiveInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LastActiveInterceptor.name);
  private readonly touched = new Map<string, number>();

  constructor(private readonly dataSource: DataSource) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() === 'http') {
      const req = context
        .switchToHttp()
        .getRequest<{ user?: { id?: unknown } }>();
      const id = typeof req.user?.id === 'string' ? req.user.id : null;
      if (id) this.touch(id);
    }
    return next.handle();
  }

  private touch(userId: string): void {
    const now = Date.now();
    if (now - (this.touched.get(userId) ?? 0) < EVERY_MS) return;
    this.touched.set(userId, now);
    if (this.touched.size > 20_000) this.touched.clear();
    this.dataSource
      .query(
        `UPDATE users SET last_seen_at = now()
          WHERE id = $1 AND (last_seen_at IS NULL OR last_seen_at < now() - interval '5 minutes')`,
        [userId],
      )
      .catch((err: Error) =>
        this.logger.warn(`last_seen_at not updated: ${err.message}`),
      );
  }
}
