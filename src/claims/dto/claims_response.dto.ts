import { Expose, Transform } from 'class-transformer';

export class ClaimResponseDto {
  @Expose()
  id!: string;

  @Expose()
  @Transform(({ value }) => Number(value))
  amount!: number;

  @Expose()
  status!: 'pending' | 'under_review' | 'recovered' | 'failed';

  // Map the database 'details' property to 'description' automatically
  @Expose({ name: 'details' })
  description!: string;

  @Expose({ name: 'created_at' })
  @Transform(({ value }) => new Date(value as string).toISOString())
  dateCreated!: string;
}
