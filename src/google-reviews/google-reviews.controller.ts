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
import { Throttle } from '@nestjs/throttler';
import { GoogleReviewsService } from './google-reviews.service';
import {
  VerifyGooglePlaceDto,
  ConfirmGooglePlaceDto,
  GoogleConnectCodeDto,
} from './dto';
import { Public } from '../common/decorators/public.decorator';
import { User } from '../entities';

@ApiTags('Google Reviews')
@Controller('google-reviews')
export class GoogleReviewsController {
  constructor(private readonly googleReviewsService: GoogleReviewsService) {}

  @Post('connect/:providerId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({
    summary:
      "Connect the Google listing found under this business's phone number",
    description:
      "Links at once when the listing carries the owner's login number; otherwise texts a code to the number on the listing.",
  })
  @ApiParam({ name: 'providerId', type: String })
  connect(
    @Param('providerId', ParseUUIDPipe) providerId: string,
    @Request() req: { user: User },
  ) {
    return this.googleReviewsService.connectForOwner(providerId, req.user);
  }

  @Post('connect/:providerId/verify')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({
    summary:
      "Finish connecting Google with the code sent to the listing's number",
  })
  @ApiParam({ name: 'providerId', type: String })
  connectVerify(
    @Param('providerId', ParseUUIDPipe) providerId: string,
    @Body() dto: GoogleConnectCodeDto,
    @Request() req: { user: User },
  ) {
    return this.googleReviewsService.connectVerifyForOwner(
      providerId,
      req.user,
      dto.code,
    );
  }

  /** Superseded by connect: owners get a 403 asking them to update the app. */
  @Post('verify/:providerId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Deprecated — owners use connect/:providerId' })
  @ApiParam({ name: 'providerId', type: String })
  findCandidates(
    @Param('providerId', ParseUUIDPipe) providerId: string,
    @Body() dto: VerifyGooglePlaceDto,
    @Request() req: any,
  ) {
    return this.googleReviewsService.findPlaceCandidates(
      providerId,
      dto.phoneNumber,
      req.user.id,
    );
  }

  @Post('confirm/:providerId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Deprecated — owners use connect/:providerId' })
  @ApiParam({ name: 'providerId', type: String })
  confirmPlace(
    @Param('providerId', ParseUUIDPipe) providerId: string,
    @Body() dto: ConfirmGooglePlaceDto,
    @Request() req: any,
  ) {
    return this.googleReviewsService.confirmGooglePlace(
      providerId,
      dto.placeId,
      req.user.id,
    );
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
  @ApiOperation({
    summary:
      'Get Google reviews for a provider (from the stored mirror, refreshed on a schedule)',
  })
  @ApiParam({ name: 'providerId', type: String })
  getGoogleReviews(@Param('providerId', ParseUUIDPipe) providerId: string) {
    return this.googleReviewsService.getGoogleReviews(providerId);
  }

  @Get('provider/:providerId/combined')
  @Public()
  @ApiOperation({
    summary: 'Get combined app + Google reviews with aggregate ratings',
  })
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
