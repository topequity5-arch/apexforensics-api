import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateThreadDto {
  @IsUUID()
  @IsNotEmpty()
  claimId!: string;

  @IsNotEmpty()
  @IsString()
  complaintTitle!: string;

  @IsNotEmpty()
  @IsString()
  complaintDescription!: string;
}
