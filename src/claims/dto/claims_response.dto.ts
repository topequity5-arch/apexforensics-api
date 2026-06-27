import { Expose, Transform } from 'class-transformer';

export class ClaimResponseDto {
  @Expose()
  id!: string;

  @Expose({ name: 'client_id' })
  clientId!: string;

  @Expose()
  @Transform(({ value }) => Number(value))
  amount!: number;

  @Expose()
  status!: 'pending' | 'under_review' | 'recovered' | 'failed';

  @Expose({ name: 'details' })
  description!: string;

  @Expose({ name: 'created_at' })
  @Transform(({ value }) => new Date(value as string).toISOString())
  dateCreated!: string;

  @Expose({ name: 'updated_at' })
  @Transform(({ value }) => new Date(value as string).toISOString())
  dateUpdated!: string;
}
