/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  override handleRequest(err: any, user: any, info: any) {
    // If Passport failed to validate, 'info' contains the exact reason
    if (err || !user) {
      console.error('--- Passport JWT Auth Failure ---');
      console.error('Error Details:', err);
      console.error('Passport Info Message:', info?.message); // e.g., "jwt expired", "invalid signature"
      console.error('---------------------------------');
      throw (
        err ||
        new UnauthorizedException(
          'Authentication credentials invalid or missing.',
        )
      );
    }
    return user;
  }
}
