import {
  IsString,
  IsOptional,
  IsNotEmpty,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VerifyGooglePlaceDto {
  @ApiPropertyOptional({
    description:
      'Override phone number to search (defaults to provider contactNumber)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phoneNumber?: string;
}

export class ConfirmGooglePlaceDto {
  @ApiProperty({ description: 'Google Place ID to link to this provider' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Matches(/^[A-Za-z0-9_-]+$/, { message: 'Invalid Google Place ID format' })
  placeId: string;
}

// Response types (not validated, just typed)
export interface GooglePlaceCandidate {
  placeId: string;
  name: string;
  address: string;
  rating?: number;
  userRatingsTotal?: number;
  phoneNumber?: string;
}

export interface GoogleReviewResponse {
  source: 'google';
  authorName: string;
  authorPhotoUrl: string | null;
  authorUrl: string | null;
  rating: number;
  text: string;
  relativeTimeDescription: string;
  time: number; // unix timestamp
  googleAttribution: {
    authorUrl: string | null;
    photoUrl: string | null;
  };
}

export interface CombinedReviewsResponse {
  appReviews: {
    data: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  googleReviews: GoogleReviewResponse[];
  aggregates: {
    combinedRating: number | null;
    combinedReviewCount: number | null;
    appRating: number | null;
    appReviewCount: number;
    googleRating: number | null;
    googleReviewCount: number | null;
    trustLevel: string;
  };
}

export class GoogleConnectCodeDto {
  @ApiProperty({
    description: 'The 6-digit code sent to the number on the Google listing',
  })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Enter the 6-digit code' })
  code: string;
}
