import { Controller, Post, Body, Get, UseGuards, Req } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { AuthGuard } from '@nestjs/passport';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import type {
  AuthenticatedRequest,
  AuthenticatedUser,
} from './interface/authenticated-request.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly supabaseService: SupabaseService) {}

  @Post('register')
  async register(@Body() body: RegisterDto) {
    const { data, error } = await this.supabaseService.client.auth.signUp({
      email: body.email,
      password: body.password,
      phone: body.phone, // Registers the phone number as an official auth identity channel
      options: {
        // user_metadata fields consumed by your database profile sync trigger
        data: {
          full_name: body.fullName,
          phone_number: body.phone,
        },
      },
    });

    if (error) throw error;

    // Set the role metadata safely inside the app_metadata block for JWT injection
    if (data.user) {
      const { error: roleError } =
        await this.supabaseService.adminClient.auth.admin.updateUserById(
          data.user.id,
          { app_metadata: { role: 'client' } },
        );
      if (roleError) throw roleError;
    }

    return;
  }

  @Post('login')
  async login(@Body() body: LoginDto) {
    const { data, error } =
      await this.supabaseService.client.auth.signInWithPassword({
        email: body.email,
        password: body.password,
      });
    if (error) throw error;
    return data;
  }
}

@Controller('users')
export class UsersController {
  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  getProfile(@Req() req: AuthenticatedRequest): AuthenticatedUser {
    return req.user;
  }
}
