import { Controller, Post, Get, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, ReportReviewDto } from './dto/review.dto';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get('listing/:listingId')
  @ApiOperation({ summary: 'Get all active reviews for a listing (public)' })
  getForListing(@Param('listingId') listingId: string) {
    return this.reviewsService.getForListing(listingId);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Submit a review for a listing' })
  create(@Request() req, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(req.user.id, dto);
  }

  @Post(':id/report')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Report a review as inappropriate' })
  report(@Param('id') id: string, @Request() req, @Body() dto: ReportReviewDto) {
    return this.reviewsService.report(id, req.user.id, dto);
  }
}
