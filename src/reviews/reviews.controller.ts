import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
  Query,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';

import { AuthGuard } from '@nestjs/passport';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, ReportReviewDto } from './dto/review.dto';
import { UpdateReviewStatusDto } from './dto/review.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get('listing/:listingId')
  @ApiOperation({ summary: 'Get all active reviews for a listing (public)' })
  @ApiParam({ name: 'listingId', type: String })
  getForListing(@Param('listingId') listingId: string) {
    return this.reviewsService.getForListing(listingId);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Submit a review for a listing' })
  create(@Request() req: any, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(req.user.id, dto);
  }

  @Post(':id/report')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Report a review as inappropriate' })
  @ApiParam({ name: 'id', type: String })
  report(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: ReportReviewDto,
  ) {
    return this.reviewsService.report(id, req.user.id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get review by ID' })
  @ApiParam({ name: 'id', type: String })
  findOne(@Param('id') id: string) {
    return this.reviewsService.findOne(id);
  }

  // ✅ 5. Admin: Change status (MODERATION)
  @Patch(':id/status')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt')) // later replace with AdminGuard
  @ApiOperation({ summary: 'Change review status (admin)' })
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateReviewStatusDto,
    @Request() req: any,
  ) {
    return this.reviewsService.updateStatus(
      id,
      dto.status, // ✅ correct type
      req.user.id,
    );
  }

  @Post('upload-photo')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        review_id: { type: 'string' },
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  uploadPhoto(
    @Body('review_id') reviewId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.reviewsService.uploadPhoto(reviewId, file);
  }

  @Get()
  @ApiOperation({ summary: 'Get all reviews with pagination & filters' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'name', required: false })
  @ApiQuery({ name: 'contact', required: false })
  findAll(@Query() query: any) {
    return this.reviewsService.findAll(query);
  }
}
