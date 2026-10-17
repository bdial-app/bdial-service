import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class AcceptItemDto {
  @IsString()
  @Matches(/^[a-z0-9-]{1,60}$/)
  slug: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  version: number;
}

export class AcceptLegalDto {
  @ValidateNested({ each: true })
  @Type(() => AcceptItemDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  documents: AcceptItemDto[];

  /** Where they ticked: the sign-in prompt, or the last step of listing a business. */
  @IsIn(['signin_prompt', 'business_onboarding'])
  method: 'signin_prompt' | 'business_onboarding';

  @IsOptional()
  @IsIn(['ios', 'android', 'web'])
  platform?: 'ios' | 'android' | 'web';
}

export class LegalDraftDto {
  @IsString()
  @MaxLength(120)
  title: string;

  @IsString()
  @MaxLength(300)
  summary: string;

  @IsString()
  @MaxLength(200_000)
  content: string;
}

export class PublishLegalDto extends LegalDraftDto {
  @IsString()
  @MaxLength(300)
  changeNote: string;

  /** Everyone it applies to must accept this version on their next visit. */
  @IsBoolean()
  requiresAcceptance: boolean;

  @IsIn(['everyone', 'business', 'none'])
  requiredFor: 'everyone' | 'business' | 'none';
}
