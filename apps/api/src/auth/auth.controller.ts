import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { BetterAuthGuard, AuthenticatedRequest } from './better-auth.guard';

@Controller('auth')
export class AuthController {
  @Get('providers')
  getProviders() {
    return {
      google: Boolean(
        process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
      ),
      facebook: Boolean(
        process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET,
      ),
    };
  }

  @UseGuards(BetterAuthGuard)
  @Get('me')
  getCurrentUser(@Req() request: AuthenticatedRequest) {
    return {
      id: request.user.userId,
      email: request.user.email,
      name: request.user.name,
      role: request.user.role ?? 'user',
      customerType: request.user.customerType,
      companyName: request.user.companyName,
      phoneNumber: request.user.phoneNumber,
      tinNumber: request.user.tinNumber,
      teamSize: request.user.teamSize,
    };
  }
}
