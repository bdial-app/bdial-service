import { ROLE_HIERARCHY } from './enums/admin-role.enum';
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SystemLogsService } from '../system-logs/system-logs.service';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(
    private readonly config: ConfigService,
    private readonly logs?: SystemLogsService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message = typeof res === 'string' ? res : res;
    }

    // Into the admin Logs: every server failure, and the rejections worth
    // chasing (bad input, forbidden, conflict, too large, rate-limited).
    // Not 401 (expired sessions) or 404 (bots and typos).
    const req = ctx.getRequest<import('express').Request>();
    // Sign-in rejections are recorded by the auth controller, with the phone.
    const authRoute = (req?.originalUrl ?? '').startsWith('/api/auth/');
    if (
      this.logs &&
      (status >= 500 ||
        ([400, 403, 409, 413, 422, 429].includes(status) && !authRoute))
    ) {
      const text =
        typeof message === 'string'
          ? message
          : Array.isArray((message as { message?: unknown }).message)
            ? (message as { message: string[] }).message.join('; ')
            : String(
                (message as { message?: unknown }).message ??
                  JSON.stringify(message),
              );
      this.logs.record({
        ...this.logs.fromRequest(req),
        source: 'server',
        level: status >= 500 ? 'error' : 'warn',
        category: 'http',
        event: `http_${status}`,
        message:
          status >= 500 && exception instanceof Error
            ? exception.message
            : text,
        stack:
          status >= 500 && exception instanceof Error
            ? (exception.stack ?? null)
            : null,
        statusCode: status,
      });
    }

    // Log full error details server-side
    if (status >= 500) {
      this.logger.error(
        `${status} - ${exception instanceof Error ? exception.message : 'Unknown error'}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    // Staff get the real reason for an unexpected failure (a database error,
    // a bug) so it can be fixed; everyone else gets the generic message.
    const role = (
      ctx.getRequest<{ user?: { role?: string } }>()?.user?.role ?? ''
    ).toLowerCase();
    const staff = (ROLE_HIERARCHY[role] ?? 0) >= ROLE_HIERARCHY.associate;
    if (
      staff &&
      status >= 500 &&
      !(exception instanceof HttpException) &&
      exception instanceof Error
    ) {
      response.status(status).json({
        statusCode: status,
        message: `Internal server error: ${exception.message}`,
      });
      return;
    }

    // In production, strip stack traces and internal details from 500 errors
    const isProd = this.config.get('NODE_ENV') === 'production';
    if (isProd && status >= 500) {
      response.status(status).json({
        statusCode: status,
        message: 'Internal server error',
      });
      return;
    }

    response
      .status(status)
      .json(
        typeof message === 'object' ? message : { statusCode: status, message },
      );
  }
}
