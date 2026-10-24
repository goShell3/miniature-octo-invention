import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  AdminGuard,
  AuthenticatedRequest,
  BetterAuthGuard,
} from '../auth/better-auth.guard';
import { CreateNfcOrderDto } from './dto/create-nfc-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
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
  @Post('nfc-orders/:id/verify-payment')
  verifyPayment(
    @Req() request: AuthenticatedRequest,
    @Param('id') orderId: string,
    @Body() input: VerifyPaymentDto,
  ) {
    return this.nfcOrdersService.verifyPayment(
      orderId,
      request.user.userId,
      input,
    );
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

  // --- Admin Order Management & Print Queue Endpoints ---
  @UseGuards(BetterAuthGuard, AdminGuard)
  @Get('admin/orders/stats')
  getAdminStats() {
    return this.nfcOrdersService.getAdminQueueStats();
  }

  @UseGuards(BetterAuthGuard, AdminGuard)
  @Get('admin/orders')
  findAllAdmin(
    @Query('status') status?: string,
    @Query('paymentStatus') paymentStatus?: string,
    @Query('search') search?: string,
  ) {
    return this.nfcOrdersService.findAllAdmin({
      status,
      paymentStatus,
      search,
    });
  }

  @UseGuards(BetterAuthGuard, AdminGuard)
  @Patch('admin/orders/:id/status')
  updateOrderStatus(
    @Param('id') id: string,
    @Body() input: UpdateOrderStatusDto,
  ) {
    return this.nfcOrdersService.updateOrderStatus(id, input);
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
