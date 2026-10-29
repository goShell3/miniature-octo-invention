import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../database/entities/user.entity';
import { BetterAuthGuard, AuthenticatedRequest } from './better-auth.guard';
import { UpdateBrandKitDto } from './dto/update-brand-kit.dto';

@Controller('auth')
export class AuthController {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepo: Repository<UserEntity>,
  ) {}

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
  async getCurrentUser(@Req() request: AuthenticatedRequest) {
    const dbUser = await this.usersRepo.findOneBy({ id: request.user.userId });
    return {
      id: request.user.userId,
      email: dbUser?.email ?? request.user.email,
      name: dbUser?.name ?? request.user.name,
      role: request.user.role ?? 'user',
      customerType: dbUser?.customerType ?? request.user.customerType,
      companyName: dbUser?.companyName ?? request.user.companyName,
      companyLogoUrl: dbUser?.companyLogoUrl ?? null,
      brandColor: dbUser?.brandColor ?? null,
      phoneNumber: dbUser?.phoneNumber ?? request.user.phoneNumber,
      tinNumber: dbUser?.tinNumber ?? request.user.tinNumber,
      teamSize: dbUser?.teamSize ?? request.user.teamSize,
    };
  }

  @UseGuards(BetterAuthGuard)
  @Patch('brand-kit')
  async updateBrandKit(
    @Req() request: AuthenticatedRequest,
    @Body() input: UpdateBrandKitDto,
  ) {
    const user = await this.usersRepo.findOneBy({ id: request.user.userId });
    if (!user) throw new Error('User not found');

    if (input.companyName !== undefined) {
      user.companyName = input.companyName.trim() || null;
    }
    if (input.companyLogoUrl !== undefined) {
      user.companyLogoUrl = input.companyLogoUrl.trim() || null;
    }
    if (input.brandColor !== undefined) {
      user.brandColor = input.brandColor.trim() || null;
    }
    if (input.customerType !== undefined) {
      user.customerType = input.customerType;
    }

    await this.usersRepo.save(user);

    return {
      companyName: user.companyName,
      companyLogoUrl: user.companyLogoUrl,
      brandColor: user.brandColor,
      customerType: user.customerType,
    };
  }
}
