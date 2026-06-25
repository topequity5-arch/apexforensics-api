/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { UpdateRoleDto } from './dto/update_role.dto';
import { UserResponseDto } from './dto/user_response.dto';

export interface GetUsersQueryDto {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class UsersService {
  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Retrieves a paginated, searchable, and sorted list of user profiles
   */
  async getUsers(query: GetUsersQueryDto): Promise<{
    data: UserResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const sortBy = query.sortBy || 'created_at';
    const sortOrder = query.sortOrder === 'desc' ? 'desc' : 'asc';
    const search = query.search?.trim();

    // Calculate zero-indexed range boundaries for Supabase
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // 1. Initialize query builder with count strategy
    let supabaseQuery = this.supabaseService.client
      .from('profiles')
      .select('*', { count: 'exact' });

    // 2. Dynamic Text Search
    // Assumes columns like 'email', 'full_name', or 'username' exist. Adjust column names to match your schema.
    if (search) {
      supabaseQuery = supabaseQuery.or(
        `email.ilike.%${search}%,full_name.ilike.%${search}%`,
      );
    }

    // 3. Apply Sorting and Pagination Ranges
    const { data, error, count } = await supabaseQuery
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(from, to);

    if (error) {
      throw new BadRequestException(
        `Failed to fetch profiles: ${error.message}`,
      );
    }

    return {
      data: (data || []) as UserResponseDto[],
      total: count || 0,
      page,
      limit,
    };
  }

  /**
   * Retrieves a single user's public profile record by their ID
   */
  async getProfile(userId: string): Promise<UserResponseDto> {
    const { data, error } = await this.supabaseService.client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) {
      throw new NotFoundException('User profile not found');
    }

    return data as UserResponseDto;
  }

  /**
   * Admin-only: Updates a user's system metadata role inside Supabase Auth
   */
  async updateUserRole(
    updateRoleDto: UpdateRoleDto,
  ): Promise<{ message: string }> {
    const { data: userCheck, error: fetchError } =
      await this.supabaseService.adminClient.auth.admin.getUserById(
        updateRoleDto.userId,
      );

    if (fetchError || !userCheck.user) {
      throw new NotFoundException('Target user account not found');
    }

    const { error: updateError } =
      await this.supabaseService.adminClient.auth.admin.updateUserById(
        updateRoleDto.userId,
        { app_metadata: { role: updateRoleDto.role } },
      );

    if (updateError) {
      throw new BadRequestException(
        `Failed to modify metadata: ${updateError.message}`,
      );
    }

    return {
      message: `User role successfully updated to ${updateRoleDto.role}`,
    };
  }
}
