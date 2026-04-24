import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly config: ConfigService) {}

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

    // Log full error details server-side
    if (status >= 500) {
      this.logger.error(
        `${status} - ${exception instanceof Error ? exception.message : 'Unknown error'}`,
        exception instanceof Error ? exception.stack : undefined,
      );
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

    response.status(status).json(
      typeof message === 'object' ? message : { statusCode: status, message },
    );
  }
}
