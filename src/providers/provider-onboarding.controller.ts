import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Put,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ProviderOnboardingService } from './provider-onboarding.service';
import {
  SaveOnboardingDraftDto,
  UploadOnboardingMediaDto,
} from './dto/provider-onboarding.dto';
import { UPLOAD_LIMITS } from '../common/image-processor';

type AuthedRequest = { user: { id: string } };

/**
 * Save-as-you-go for "List your business". The final submit stays
 * POST /providers/become-provider; this keeps progress and photos safe first.
 */
@ApiTags('Provider onboarding')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('provider-onboarding')
export class ProviderOnboardingController {
  constructor(private readonly onboarding: ProviderOnboardingService) {}

  @Get('draft')
  @ApiOperation({ summary: 'Saved progress for the signed-in user, or null' })
  getDraft(@Request() req: AuthedRequest) {
    return this.onboarding.getDraft(req.user.id);
  }

  @Put('draft')
  @Throttle({ default: { ttl: 60000, limit: 60 } })
  @ApiOperation({ summary: 'Save progress (replaces the previous draft)' })
  saveDraft(
    @Request() req: AuthedRequest,
    @Body() dto: SaveOnboardingDraftDto,
  ) {
    return this.onboarding.saveDraft(req.user.id, dto.data, dto.step);
  }

  @Delete('draft')
  @ApiOperation({ summary: 'Throw the draft away (start over)' })
  deleteDraft(@Request() req: AuthedRequest) {
    return this.onboarding.deleteDraft(req.user.id);
  }

  @Post('media')
  @Throttle({ default: { ttl: 60000, limit: 60 } })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', { limits: UPLOAD_LIMITS }),
  )
  @ApiOperation({
    summary:
      'Upload one photo or document as soon as it is picked; returns its URL for the draft and the submit',
  })
  uploadMedia(
    @Body() dto: UploadOnboardingMediaDto,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    return this.onboarding.uploadMedia(dto.kind, file);
  }
}
