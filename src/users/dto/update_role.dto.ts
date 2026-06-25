import { IsEnum, IsNotEmpty, IsUUID } from 'class-validator';

export class UpdateRoleDto {
  @IsUUID()
  @IsNotEmpty()
  userId!: string;

  @IsEnum(['admin', 'client'], {
    message: 'Role must be either admin or client',
  })
  @IsNotEmpty()
  role!: 'admin' | 'client';
}
