import { randomBytes } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  AdminOrderSummary,
  AdminQueueStats,
  NFC_CARD_TIER_PRICES_ETB,
  NfcCardTier,
  getTierFromQuantity,
} from '@amalink/types';
import { CardTapEntity } from '../database/entities/card-tap.entity';
import { NfcOrderEntity } from '../database/entities/nfc-order.entity';
import { PortfolioEntity } from '../database/entities/portfolio.entity';
import { UserEntity } from '../database/entities/user.entity';
import { TelegramService } from '../telegram/telegram.service';
import { ChekiService } from './cheki.service';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

@Injectable()
export class NfcOrdersService {
  constructor(
    @InjectRepository(PortfolioEntity)
    private readonly portfoliosRepository: Repository<PortfolioEntity>,
    @InjectRepository(NfcOrderEntity)
    private readonly ordersRepository: Repository<NfcOrderEntity>,
    @InjectRepository(CardTapEntity)
    private readonly tapsRepository: Repository<CardTapEntity>,
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    private readonly chekiService: ChekiService,
    private readonly telegramService: TelegramService,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    ownerId: string,
    input: {
      portfolioId: string;
      tier: NfcCardTier;
      quantity: number;
      name: string;
      phone: string;
      addressLine1: string;
      addressLine2?: string;
      city: string;
      region: string;
      countryCode: string;
      postalCode?: string;
    },
  ) {
    const portfolio = await this.portfoliosRepository.findOne({
      where: {
        id: input.portfolioId,
        owner: { id: ownerId },
        status: 'published',
      },
    });
    if (!portfolio)
      throw new NotFoundException('Published portfolio not found');

    const owner = await this.usersRepository.findOne({
      where: { id: ownerId },
      select: { id: true, email: true, companyName: true, companyLogoUrl: true, brandColor: true, customerType: true },
    });
    const resolvedTier: NfcCardTier = getTierFromQuantity(input.quantity);

    const address = {
      name: input.name,
      phone: input.phone,
      addressLine1: input.addressLine1,
      addressLine2: input.addressLine2,
      city: input.city,
      region: input.region,
      postalCode: input.postalCode,
      countryCode: input.countryCode.toUpperCase(),
    };
    let order: NfcOrderEntity;
    do {
      order = this.ordersRepository.create({
        portfolio,
        shortLinkCode: randomBytes(6).toString('base64url'),
        status: 'pending',
        paymentStatus: 'unpaid',
        tier: resolvedTier,
        quantity: input.quantity,
        unitPrice: NFC_CARD_TIER_PRICES_ETB[resolvedTier],
        shippingAddress: address,
      });
    } while (
      await this.ordersRepository.existsBy({
        shortLinkCode: order.shortLinkCode,
      })
    );

    await this.ordersRepository.save(order);

    // Send instant Telegram admin notification
    void this.telegramService
      .sendNewOrderNotification({
        id: order.id,
        tier: order.tier,
        quantity: order.quantity,
        totalAmount: order.unitPrice * order.quantity,
        currency: 'ETB',
        customerName: address.name,
        customerPhone: address.phone,
        customerEmail: owner?.email,
        companyName: owner?.companyName,
        shippingAddress: address,
        isPaid: false,
      })
      .catch((err) => console.error('Telegram notification error:', err));

    return this.formatOrder(order);
  }

  async findMine(ownerId: string) {
    const orders = await this.ordersRepository.find({
      where: { portfolio: { owner: { id: ownerId } } },
      relations: { portfolio: true },
      order: { createdAt: 'DESC' },
    });
    return orders.map((order) => this.formatOrder(order));
  }

  async verifyPayment(orderId: string, ownerId: string, input: VerifyPaymentDto) {
    const order = await this.ordersRepository.findOne({
      where: {
        id: orderId,
        portfolio: { owner: { id: ownerId } },
      },
      relations: { portfolio: { owner: true } },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.paymentStatus === 'paid') {
      return {
        success: true,
        verified: true,
        message: 'Order has already been verified and paid.',
        order: this.formatOrder(order),
      };
    }

    // ── Secondary Verification: Screenshot Upload ──
    if (input.verificationType === 'screenshot' || input.screenshotUrl) {
      order.paymentStatus = 'verifying';
      if (input.method) order.paymentMethod = input.method;
      if (input.reference) order.paymentReference = input.reference;
      order.paymentVerificationData = {
        verificationType: 'screenshot',
        screenshotUrl: input.screenshotUrl,
        notes: input.notes,
        submittedAt: new Date().toISOString(),
      };
      await this.ordersRepository.save(order);

      // Send Telegram notification to admin team
      const ref = `KL-${order.id.slice(0, 8).toUpperCase()}`;
      const customerName = order.shippingAddress?.name || order.portfolio?.owner?.name || 'Customer';
      const customerPhone = order.shippingAddress?.phone || order.portfolio?.owner?.phoneNumber || 'N/A';
      const amount = (order.unitPrice * order.quantity).toLocaleString();
      const methodLabel = (order.paymentMethod || input.method || 'Manual').toUpperCase();

      void this.telegramService
        .sendAdminNotification(
          `📸 <b>PAYMENT RECEIPT SCREENSHOT SUBMITTED</b>\n\n` +
          `<b>Order Ref:</b> <code>${ref}</code>\n` +
          `<b>Status:</b> ⏳ <b>MANUAL VERIFICATION REQUIRED</b>\n` +
          `<b>Customer:</b> ${escapeHtml(customerName)}\n` +
          `<b>Phone:</b> <code>${escapeHtml(customerPhone)}</code>\n` +
          `<b>Method:</b> ${methodLabel}\n` +
          `<b>Amount:</b> <b>${amount} ETB</b> (${order.quantity} card${order.quantity > 1 ? 's' : ''})\n` +
          (input.notes ? `<b>Customer Note:</b> <i>${escapeHtml(input.notes)}</i>\n` : '') +
          `\n👉 <i>Review screenshot & approve in Operations Portal:</i>\nhttps://www.koo-link.com/admin`
        )
        .catch((err) => console.error('Telegram notification error:', err));

      return {
        success: true,
        verified: false,
        pendingReview: true,
        message: 'Receipt screenshot submitted successfully! Our operations team has been notified and will verify your payment shortly.',
        order: this.formatOrder(order),
        details: {
          verificationType: 'screenshot',
          submittedAt: new Date().toISOString(),
        },
      };
    }

    // ── Primary Verification: Receipt URL / Cheki Automated Verification ──
    const expectedAmount = order.unitPrice * order.quantity;
    const result = await this.chekiService.verifyPayment({
      bank: input.method,
      reference: input.reference,
      chekiUrl: input.chekiUrl,
      expectedAmount,
    });

    if (result.verified) {
      order.paymentStatus = 'paid';
      order.status = 'printing';
      order.paymentMethod = input.method || (result.bank?.toLowerCase().includes('cbe') ? 'cbe' : 'telebirr');
      order.paymentReference = result.reference || input.reference || null;
      order.chekiUrl = result.sourceUrl || input.chekiUrl || null;
      order.paymentVerifiedAt = new Date();
      order.paymentVerificationData = {
        verificationType: 'url',
        ...(result.raw || {
          amount: result.amount,
          senderName: result.senderName,
          receiverName: result.receiverName,
          date: result.date,
        }),
      };

      await this.ordersRepository.save(order);

      // Send instant Telegram admin notification for paid card order
      void this.telegramService
        .sendNewOrderNotification({
          id: order.id,
          tier: order.tier,
          quantity: order.quantity,
          totalAmount: order.unitPrice * order.quantity,
          currency: 'ETB',
          customerName: order.shippingAddress?.name || 'Customer',
          customerPhone: order.shippingAddress?.phone || '',
          customerEmail: order.portfolio?.owner?.email,
          companyName: order.portfolio?.owner?.companyName,
          shippingAddress: order.shippingAddress,
          paymentMethod: order.paymentMethod,
          paymentReference: order.paymentReference,
          isPaid: true,
        })
        .catch((err) => console.error('Telegram notification error:', err));

      return {
        success: true,
        verified: true,
        message: 'Payment successfully verified via Cheki! Order moved to printing queue.',
        order: this.formatOrder(order),
        details: {
          reference: order.paymentReference,
          amount: result.amount,
          receiverName: result.receiverName,
          senderName: result.senderName,
          date: result.date,
        },
      };
    }

    // In case automated URL verification failed, persist reference & attempted URL for admin review
    if (input.reference || input.chekiUrl) {
      order.paymentReference = input.reference || order.paymentReference;
      order.chekiUrl = input.chekiUrl || order.chekiUrl;
      if (input.method) order.paymentMethod = input.method;
      await this.ordersRepository.save(order);
    }

    return {
      success: false,
      verified: false,
      message: result.message || 'Payment URL could not be verified automatically. You can also upload a receipt screenshot as secondary verification or reach out on WhatsApp.',
      order: this.formatOrder(order),
    };
  }

  // --- Admin Order Management & Print Queue Methods ---
  async findAllAdmin(filter?: { status?: string; paymentStatus?: string; search?: string }): Promise<AdminOrderSummary[]> {
    const qb = this.ordersRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.portfolio', 'portfolio')
      .leftJoinAndSelect('portfolio.owner', 'owner')
      .orderBy('order.createdAt', 'DESC');

    if (filter?.status && filter.status !== 'all') {
      qb.andWhere('order.status = :status', { status: filter.status });
    }

    if (filter?.paymentStatus && filter.paymentStatus !== 'all') {
      qb.andWhere('order.paymentStatus = :paymentStatus', { paymentStatus: filter.paymentStatus });
    }

    if (filter?.search) {
      const s = `%${filter.search.toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(order.id::text) LIKE :s OR LOWER(order.shortLinkCode) LIKE :s OR LOWER(order.paymentReference) LIKE :s OR LOWER(portfolio.subdomain) LIKE :s OR LOWER(owner.name) LIKE :s OR LOWER(owner.email) LIKE :s OR LOWER(owner.phoneNumber) LIKE :s OR LOWER(order.shippingAddress::text) LIKE :s)',
        { s },
      );
    }

    const orders = await qb.getMany();
    return orders.map((order) => this.formatAdminOrder(order));
  }

  async getAdminQueueStats(): Promise<AdminQueueStats> {
    const orders = await this.ordersRepository.find();

    let totalRevenueETB = 0;
    let totalCards = 0;
    let printingCount = 0;
    let pendingCount = 0;
    let shippedCount = 0;
    let deliveredCount = 0;
    let unpaidCount = 0;

    for (const order of orders) {
      const qty = order.quantity || 1;
      totalCards += qty;
      if (order.paymentStatus === 'paid') {
        totalRevenueETB += qty * (order.unitPrice || 0);
      } else {
        unpaidCount++;
      }

      if (order.status === 'printing') printingCount++;
      else if (order.status === 'pending') pendingCount++;
      else if (order.status === 'shipped') shippedCount++;
      else if (order.status === 'delivered') deliveredCount++;
    }

    return {
      totalOrders: orders.length,
      printingCount,
      pendingCount,
      shippedCount,
      deliveredCount,
      totalRevenueETB,
      totalCards,
      unpaidCount,
    };
  }

  async updateOrderStatus(orderId: string, input: UpdateOrderStatusDto): Promise<AdminOrderSummary> {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
      relations: { portfolio: { owner: true } },
    });
    if (!order) throw new NotFoundException('Order not found');

    if (input.status) {
      order.status = input.status;
      // If advancing to printing queue and unpaid, automatically mark paid
      if (input.status === 'printing' && order.paymentStatus !== 'paid') {
        order.paymentStatus = 'paid';
        order.paymentVerifiedAt = new Date();
      }
    }

    if (input.paymentStatus) {
      order.paymentStatus = input.paymentStatus;
      if (input.paymentStatus === 'paid' && !order.paymentVerifiedAt) {
        order.paymentVerifiedAt = new Date();
      }
    }

    await this.ordersRepository.save(order);
    return this.formatAdminOrder(order);
  }

  async testTelegram() {
    return this.telegramService.sendAdminNotification(
      `🚀 <b>Koolink Telegram Alert System Connected!</b>\n\nYour admin Telegram alerts are active. You will now receive instant notifications whenever a physical card order is requested or verified.`
    );
  }

  async findTarget(code: string) {
    const order = await this.ordersRepository.findOne({
      where: { shortLinkCode: code },
      relations: { portfolio: true },
    });
    if (!order) throw new NotFoundException('Short link not found');
    return { orderId: order.id, subdomain: order.portfolio.subdomain };
  }

  async recordTap(
    orderId: string,
    userAgent: string | undefined,
    roughGeo: string | undefined,
  ) {
    await this.tapsRepository.save(
      this.tapsRepository.create({
        order: { id: orderId } as NfcOrderEntity,
        userAgent: userAgent?.slice(0, 512) ?? null,
        roughGeo: roughGeo?.slice(0, 64) ?? null,
      }),
    );
  }

  async analytics(ownerId: string, portfolioId: string) {
    const portfolio = await this.portfoliosRepository.findOne({
      where: { id: portfolioId, owner: { id: ownerId } },
    });
    if (!portfolio) throw new NotFoundException('Portfolio not found');

    const taps = await this.dataSource
      .getRepository(CardTapEntity)
      .createQueryBuilder('tap')
      .innerJoin('tap.order', 'order')
      .where('order.portfolioId = :portfolioId', { portfolioId })
      .select('COUNT(tap.id)', 'count')
      .getRawOne<{ count: string }>();
    return { portfolioId, cardTaps: Number(taps?.count ?? 0) };
  }

  private formatOrder(order: NfcOrderEntity) {
    return {
      id: order.id,
      status: order.status,
      paymentStatus: order.paymentStatus ?? 'unpaid',
      paymentMethod: order.paymentMethod ?? null,
      paymentReference: order.paymentReference ?? null,
      chekiUrl: order.chekiUrl ?? null,
      paymentVerifiedAt: order.paymentVerifiedAt ? order.paymentVerifiedAt.toISOString() : null,
      paymentVerificationData: order.paymentVerificationData ?? null,
      tier: order.tier,
      quantity: order.quantity,
      unitPrice: order.unitPrice,
      totalAmount: order.unitPrice * order.quantity,
      currency: 'ETB',
      shortUrl: this.getShortUrl(order.shortLinkCode),
      shippingAddress: order.shippingAddress,
      portfolio: order.portfolio ? { id: order.portfolio.id, subdomain: order.portfolio.subdomain } : undefined,
      createdAt: order.createdAt,
    };
  }

  private formatAdminOrder(order: NfcOrderEntity): AdminOrderSummary {
    const owner = order.portfolio?.owner;
    return {
      id: order.id,
      status: order.status,
      paymentStatus: order.paymentStatus ?? 'unpaid',
      paymentMethod: order.paymentMethod ?? null,
      paymentReference: order.paymentReference ?? null,
      chekiUrl: order.chekiUrl ?? null,
      paymentVerifiedAt: order.paymentVerifiedAt ? order.paymentVerifiedAt.toISOString() : null,
      tier: order.tier,
      quantity: order.quantity,
      unitPrice: order.unitPrice,
      totalAmount: order.unitPrice * order.quantity,
      currency: 'ETB',
      shortUrl: this.getShortUrl(order.shortLinkCode),
      shippingAddress: order.shippingAddress,
      paymentVerificationData: order.paymentVerificationData,
      portfolio: {
        id: order.portfolio?.id ?? '',
        subdomain: order.portfolio?.subdomain ?? '',
        status: order.portfolio?.status ?? 'published',
      },
      owner: {
        id: owner?.id ?? '',
        email: owner?.email ?? '',
        name: owner?.name ?? 'Anonymous Customer',
        companyName: owner?.companyName ?? null,
        companyLogoUrl: owner?.companyLogoUrl ?? null,
        brandColor: owner?.brandColor ?? null,
        phoneNumber: owner?.phoneNumber ?? null,
        tinNumber: owner?.tinNumber ?? null,
        customerType: owner?.customerType ?? 'individual',
      },
      createdAt: order.createdAt,
    };
  }

  private getShortUrl(code: string) {
    const baseUrl = process.env.PUBLIC_BASE_URL ?? 'https://sewnet.vercel.app/';
    return `${baseUrl.replace(/\/$/, '')}/c/${code}`;
  }
}
