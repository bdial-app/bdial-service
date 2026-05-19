import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class UpdateVerificationStatusDto {
  @IsOptional()
  @IsEnum(['pending', 'approved', 'rejected'])
  aadhaarStatus?: 'pending' | 'approved' | 'rejected';

  @IsOptional()
  @IsEnum(['pending', 'approved', 'rejected', 'not_submitted'])
  ijamatStatus?: 'pending' | 'approved' | 'rejected' | 'not_submitted';

  @IsOptional()
  @IsEnum(['pending', 'approved', 'rejected'])
  status?: 'pending' | 'approved' | 'rejected';

  @IsUUID()
  id: string;
}
