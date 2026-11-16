import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export class AppReviewAskedDto {
  @ApiProperty({
    enum: ['in_app', 'whatsapp', 'push'],
    default: 'in_app',
    required: false,
    description: 'Which channel spent the ask.',
  })
  @IsOptional()
  @IsIn(['in_app', 'whatsapp', 'push'])
  channel?: 'in_app' | 'whatsapp' | 'push';

  @ApiProperty({
    required: false,
    description: 'Set when the person asked not to be shown this again.',
  })
  @IsOptional()
  @IsIn([true, false])
  optOut?: boolean;
}
