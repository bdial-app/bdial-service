import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsObject, Max, Min } from 'class-validator';
import { ONBOARDING_MEDIA_KINDS } from '../provider-onboarding.service';
import type { OnboardingMediaKind } from '../provider-onboarding.service';

export class SaveOnboardingDraftDto {
  @ApiProperty({
    description: 'Form progress: text fields, picks and uploaded photo URLs',
  })
  @IsObject()
  data: Record<string, unknown>;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  @Max(10)
  step: number;
}

export class UploadOnboardingMediaDto {
  @ApiProperty({ enum: ONBOARDING_MEDIA_KINDS })
  @IsIn(ONBOARDING_MEDIA_KINDS)
  kind: OnboardingMediaKind;
}
