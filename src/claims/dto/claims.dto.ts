import { IsNumber, IsPositive, IsString, IsOptional } from 'class-validator';

export class CreateClaimDto {
  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsString()
  details!: string;
}

export class UpdateClaimDto {
  @IsNumber()
  @IsPositive()
  @IsOptional()
  amount?: number;

  @IsString()
  @IsOptional()
  details?: string;

  @IsString()
  @IsOptional()
  status?: 'pending' | 'under_review' | 'recovered' | 'failed';
}
