import { randomBytes } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CardTapEntity } from '../database/entities/card-tap.entity';
import { NfcOrderEntity } from '../database/entities/nfc-order.entity';
import { PortfolioEntity } from '../database/entities/portfolio.entity';

@Injectable()
export class NfcOrdersService {
  constructor(
    @InjectRepository(PortfolioEntity)
    private readonly portfoliosRepository: Repository<PortfolioEntity>,
    @InjectRepository(NfcOrderEntity)
    private readonly ordersRepository: Repository<NfcOrderEntity>,
    @InjectRepository(CardTapEntity)
    private readonly tapsRepository: Repository<CardTapEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    ownerId: string,
    input: {
      portfolioId: string;
      name: string;
      addressLine1: string;
      addressLine2?: string;
      city: string;
      region: string;
      postalCode: string;
      countryCode: string;
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

    const address = {
      name: input.name,
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
        shippingAddress: address,
      });
    } while (
      await this.ordersRepository.existsBy({
        shortLinkCode: order.shortLinkCode,
      })
    );

    await this.ordersRepository.save(order);
    return {
      id: order.id,
      status: order.status,
      shortUrl: this.getShortUrl(order.shortLinkCode),
      createdAt: order.createdAt,
    };
  }

  async findMine(ownerId: string) {
    return this.ordersRepository
      .find({
        where: { portfolio: { owner: { id: ownerId } } },
        relations: { portfolio: true },
        order: { createdAt: 'DESC' },
        select: {
          id: true,
          shortLinkCode: true,
          status: true,
          createdAt: true,
          portfolio: { id: true, subdomain: true },
        },
      })
      .then((orders) =>
        orders.map((order) => ({
          id: order.id,
          status: order.status,
          shortUrl: this.getShortUrl(order.shortLinkCode),
          portfolio: order.portfolio,
          createdAt: order.createdAt,
        })),
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

  private getShortUrl(code: string) {
    const baseUrl = process.env.PUBLIC_BASE_URL ?? 'https://sewnet.vercel.app/';
    return `${baseUrl.replace(/\/$/, '')}/c/${code}`;
  }
}
