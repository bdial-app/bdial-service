import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { GoogleReviewsService } from './google-reviews.service';
import { VerifyGooglePlaceDto, ConfirmGooglePlaceDto } from './dto';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Google Reviews')
@Controller('google-reviews')
export class GoogleReviewsController {
  constructor(private readonly googleReviewsService: GoogleReviewsService) {}

  @Post('verify/:providerId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Find Google Place candidates by phone number for verification' })
  @ApiParam({ name: 'providerId', type: String })
  findCandidates(
    @Param('providerId', ParseUUIDPipe) providerId: string,
    @Body() dto: VerifyGooglePlaceDto,
    @Request() req: any,
  ) {
    return this.googleReviewsService.findPlaceCandidates(providerId, dto.phoneNumber, req.user.id);
  }

  @Post('confirm/:providerId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Confirm and link a Google Place to a provider' })
  @ApiParam({ name: 'providerId', type: String })
  confirmPlace(
    @Param('providerId', ParseUUIDPipe) providerId: string,
    @Body() dto: ConfirmGooglePlaceDto,
    @Request() req: any,
  ) {
    return this.googleReviewsService.confirmGooglePlace(providerId, dto.placeId, req.user.id);
  }

  @Delete('unlink/:providerId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Unlink Google Place from a provider' })
  @ApiParam({ name: 'providerId', type: String })
  unlinkPlace(
    @Param('providerId', ParseUUIDPipe) providerId: string,
    @Request() req: any,
  ) {
    return this.googleReviewsService.unlinkGooglePlace(providerId, req.user.id);
  }

  @Get('provider/:providerId')
  @Public()
  @ApiOperation({ summary: 'Get Google reviews for a provider (fetched live from Google)' })
  @ApiParam({ name: 'providerId', type: String })
  getGoogleReviews(@Param('providerId', ParseUUIDPipe) providerId: string) {
    return this.googleReviewsService.getGoogleReviews(providerId);
  }

  @Get('provider/:providerId/combined')
  @Public()
  @ApiOperation({ summary: 'Get combined app + Google reviews with aggregate ratings' })
  @ApiParam({ name: 'providerId', type: String })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getCombinedReviews(
    @Param('providerId', ParseUUIDPipe) providerId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.googleReviewsService.getCombinedReviews(
      providerId,
      page ? Math.max(1, parseInt(page, 10) || 1) : 1,
      limit ? Math.min(100, Math.max(1, parseInt(limit, 10) || 20)) : 20,
    );
  }
}
