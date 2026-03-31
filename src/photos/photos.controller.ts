import {
  Controller,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFiles,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PhotosService } from './photos.service';
import { memoryStorage } from 'multer';

@ApiTags('Photos')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('photos')
export class PhotosController {
  constructor(private readonly photosService: PhotosService) {}

  // ─── Listing Photos ───────────────────────────────

  @Post('listing/:listingId')
  @ApiOperation({ summary: 'Upload photos for a listing (max 10 total, max 5 per request)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: { type: 'array', items: { type: 'string', format: 'binary' } },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('files', 5, { storage: memoryStorage() }))
  uploadListingPhotos(
    @Param('listingId') listingId: string,
    @Request() req,
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5 MB
          new FileTypeValidator({ fileType: /^image\/(jpeg|jpg|png|webp)$/ }),
        ],
      }),
    )
    files: Express.Multer.File[],
  ) {
    return this.photosService.uploadListingPhotos(listingId, req.user.id, files);
  }

  @Delete('listing/:photoId')
  @ApiOperation({ summary: 'Delete a listing photo' })
  deleteListingPhoto(@Param('photoId') photoId: string, @Request() req) {
    return this.photosService.deleteListingPhoto(photoId, req.user.id);
  }

  @Patch('listing/:listingId/reorder')
  @ApiOperation({ summary: 'Reorder listing photos by passing an ordered array of photo IDs' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { orderedIds: { type: 'array', items: { type: 'string' } } },
    },
  })
  reorderPhotos(
    @Param('listingId') listingId: string,
    @Request() req,
    @Body('orderedIds') orderedIds: string[],
  ) {
    return this.photosService.reorderPhotos(listingId, req.user.id, orderedIds);
  }

  // ─── Review Photos ────────────────────────────────

  @Post('review/:reviewId')
  @ApiOperation({ summary: 'Upload photos for a review (max 3 total)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: { type: 'array', items: { type: 'string', format: 'binary' } },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('files', 3, { storage: memoryStorage() }))
  uploadReviewPhotos(
    @Param('reviewId') reviewId: string,
    @Request() req,
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /^image\/(jpeg|jpg|png|webp)$/ }),
        ],
      }),
    )
    files: Express.Multer.File[],
  ) {
    return this.photosService.uploadReviewPhotos(reviewId, req.user.id, files);
  }

  @Delete('review/:photoId')
  @ApiOperation({ summary: 'Delete a review photo' })
  deleteReviewPhoto(@Param('photoId') photoId: string, @Request() req) {
    return this.photosService.deleteReviewPhoto(photoId, req.user.id);
  }
}
