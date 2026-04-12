export class UpdateVerificationStatusDto {
  aadhaarStatus?: 'pending' | 'approved' | 'rejected';
  ijamatStatus?: 'pending' | 'approved' | 'rejected' | 'not_submitted';
  status?: 'pending' | 'approved' | 'rejected';
  id: string;
}
