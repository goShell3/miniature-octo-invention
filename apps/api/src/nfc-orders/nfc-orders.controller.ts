import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Res } from '@nestjs/common';
import { AuthenticatedRequest, BetterAuthGuard } from '../auth/better-auth.guard';
import { CreateNfcOrderDto } from './dto/create-nfc-order.dto';
import { NfcOrdersService } from './nfc-orders.service';

@Controller()
export class NfcOrdersController {
  constructor(private readonly nfcOrdersService: NfcOrdersService) {}

  @UseGuards(BetterAuthGuard)
  @Post('nfc-orders')
  create(
    @Req() request: AuthenticatedRequest,
    @Body() input: CreateNfcOrderDto,
  ) {
    return this.nfcOrdersService.create(request.user.userId, input);
  }

  @UseGuards(BetterAuthGuard)
  @Get('nfc-orders/me')
  findMine(@Req() request: AuthenticatedRequest) {
    return this.nfcOrdersService.findMine(request.user.userId);
  }

  @UseGuards(BetterAuthGuard)
  @Get('nfc-orders/:portfolioId/analytics')
  analytics(
    @Req() request: AuthenticatedRequest,
    @Param('portfolioId') portfolioId: string,
  ) {
    return this.nfcOrdersService.analytics(request.user.userId, portfolioId);
  }

  @Get('c/:code')
  async redirect(
    @Param('code') code: string,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const target = await this.nfcOrdersService.findTarget(code);
    await this.nfcOrdersService.recordTap(
      target.orderId,
      request.get('user-agent'),
      request.get('cf-ipcountry'),
    );
    const baseDomain = process.env.PUBLIC_DOMAIN;
    if (!baseDomain)
      return response.status(503).send('Public domain is not configured');
    return response.redirect(302, `https://${target.subdomain}.${baseDomain}`);
  }
}
