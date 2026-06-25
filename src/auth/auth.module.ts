import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { SupabaseModule } from 'src/supabase/supabase.module';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [SupabaseModule],
  providers: [JwtStrategy], // CRITICAL: Registers your custom strategy class
  controllers: [AuthController],
})
export class AuthModule {}
