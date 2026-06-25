import { Request } from 'express';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: 'admin' | 'client';
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
