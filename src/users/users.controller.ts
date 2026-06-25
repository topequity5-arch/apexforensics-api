/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  Req,
  UseInterceptors,
  ClassSerializerInterceptor,
  SerializeOptions,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger'; // Import Swagger decorators
import { plainToInstance } from 'class-transformer';
import { Roles, RolesGuard } from '../auth/roles.guard';

import type { AuthenticatedRequest } from '../auth/interface/authenticated-request.interface';
import { UpdateRoleDto } from './dto/update_role.dto';
import { UserResponseDto } from './dto/user_response.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { GetUsersQueryDto } from './dto/get_users_query.dto';
import { UsersService } from './users.service';

@ApiBearerAuth('JWT-auth')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('admin')
  async getUsers(
    @Query(new ValidationPipe({ transform: true })) query: GetUsersQueryDto,
  ) {
    return this.usersService.getUsers(query);
  }

  /**
   * Fetch current user context profile details
   */
  @Get('profile')
  @SerializeOptions({ strategy: 'excludeAll' })
  async getProfile(@Req() req: AuthenticatedRequest): Promise<UserResponseDto> {
    const rawProfile = await this.usersService.getProfile(req.user.id);
    return plainToInstance(UserResponseDto, rawProfile);
  }

  /**
   * Administrative role conversion engine
   */
  @Patch('role-management')
  @Roles('admin')
  async updateUserRole(
    @Body() updateRoleDto: UpdateRoleDto,
  ): Promise<{ message: string }> {
    return this.usersService.updateUserRole(updateRoleDto);
  }
}
