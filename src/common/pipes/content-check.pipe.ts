import {
  PipeTransform,
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { ContentSanitizerService } from '../content-sanitizer/content-sanitizer.service';

/**
 * Global pipe that checks specified DTO string fields for profanity.
 * Usage: @UsePipes(new ContentCheckPipe(['reviewText', 'description']))
 * Or applied manually in a controller method.
 */
@Injectable()
export class ContentCheckPipe implements PipeTransform {
  constructor(
    private readonly fieldsToCheck: string[],
    private readonly sanitizer: ContentSanitizerService,
  ) {}

  transform(value: any) {
    if (!value || typeof value !== 'object') return value;

    for (const field of this.fieldsToCheck) {
      const text = value[field];
      if (typeof text === 'string' && text.trim()) {
        const result = this.sanitizer.check(text);
        if (result.flagged) {
          throw new BadRequestException(
            `Your ${field.replace(/([A-Z])/g, ' $1').toLowerCase()} contains inappropriate language. Please revise and try again.`,
          );
        }
      }
    }

    return value;
  }
}
