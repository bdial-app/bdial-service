import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class GenerateBrandMarkDto {
  @ApiPropertyOptional({
    description: 'Another look for the same business (0 = its default)',
    minimum: 0,
    maximum: 99,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(99)
  variant?: number;
}

export class BackfillBrandMarksDto {
  @ApiPropertyOptional({
    description: 'How many businesses to do in this call',
    minimum: 1,
    maximum: 200,
    default: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}
