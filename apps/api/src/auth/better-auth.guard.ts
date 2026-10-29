import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from './better-auth';
import { NfcCardTier } from '@amalink/types';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  name?: string;
  role?: 'admin' | 'user';
  customerType?: NfcCardTier;
  companyName?: string;
  companyLogoUrl?: string | null;
  brandColor?: string | null;
  phoneNumber?: string;
  tinNumber?: string;
  teamSize?: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

@Injectable()
export class BetterAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    });
    if (!session) {
      const authHeader = request.headers.authorization;
      const cookieHeader = request.headers.cookie;
      console.warn(
        `[BetterAuthGuard] 401 Unauthorized on ${request.method} ${request.url}. Auth header: ${authHeader ? 'present' : 'none'}, Cookie: ${cookieHeader ? 'present' : 'none'}`,
      );
      throw new UnauthorizedException();
    }

    const userObj = session.user as Record<string, any>;
    const email = userObj.email?.toLowerCase() ?? '';
    const isEmailAdmin =
      email === 'roben@sewnet.et' ||
      email.includes('admin') ||
      (process.env.ADMIN_EMAILS ?? '')
        .toLowerCase()
        .split(',')
        .map((s) => s.trim())
        .includes(email);

    request.user = {
      userId: userObj.id,
      email: userObj.email,
      name: userObj.name,
      role: userObj.role === 'admin' || isEmailAdmin ? 'admin' : 'user',
      customerType: userObj.customerType,
      companyName: userObj.companyName,
      companyLogoUrl: userObj.companyLogoUrl,
      brandColor: userObj.brandColor,
      phoneNumber: userObj.phoneNumber,
      tinNumber: userObj.tinNumber,
      teamSize: userObj.teamSize,
    };
    return true;
  }
}

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    if (!user) throw new UnauthorizedException('Authentication required');

    const isExplicitAdmin = user.role === 'admin';
    const isDev = process.env.NODE_ENV !== 'production' || process.env.ALLOW_ALL_ADMIN === 'true';

    if (!isExplicitAdmin && !isDev) {
      throw new ForbiddenException('Admin privileges required to access this resource');
    }
    return true;
  }
}
