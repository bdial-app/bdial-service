import { Body, Controller, Get, HttpCode, Post, Request } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Public } from '../common/decorators/public.decorator';
import { ReviewLinksService } from './review-links.service';

export class StartReviewDto {
  @IsString()
  @MaxLength(20)
  phone: string;

  @IsUUID()
  providerId: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  stars?: number;
}

@ApiTags('Reviews')
@Controller('review-links')
export class ReviewLinksController {
  constructor(private readonly links: ReviewLinksService) {}

  @Post('start')
  @Public()
  @HttpCode(200)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiOperation({
    summary:
      'Review link opened without the app: keep the stars for after sign-in',
  })
  start(@Body() dto: StartReviewDto) {
    return this.links.startOnWeb(dto);
  }

  @Get('mine')
  @ApiOperation({ summary: 'After sign-in: a review I started on the web' })
  async mine(@Request() req: { user: { id: string } }) {
    return { intent: await this.links.takeMine(req.user.id) };
  }
}
