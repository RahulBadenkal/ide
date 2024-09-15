// types.d.ts
import { Request } from 'express';
import { AppUser } from './db';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      user: AppUser
    }
  }
}