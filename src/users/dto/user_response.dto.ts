import { Expose } from 'class-transformer';

export class UserResponseDto {
  @Expose()
  id!: string;

  @Expose({ name: 'full_name' })
  fullName!: string;

  @Expose({ name: 'phone_number' })
  phoneNumber!: string | null;

  @Expose({ name: 'kyc_status' })
  kycStatus!: 'unverified' | 'pending' | 'verified' | 'rejected';
}
