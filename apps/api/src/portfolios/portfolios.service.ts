import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PortfolioBlock, PortfolioTheme } from '@amalink/types';
import { DataSource, Repository } from 'typeorm';
import { PortfolioContentEntity } from '../database/entities/portfolio-content.entity';
import { PortfolioEntity } from '../database/entities/portfolio.entity';
import { UserEntity } from '../database/entities/user.entity';

const reservedSubdomains = new Set([
  'www',
  'api',
  'app',
  'admin',
  'support',
  'help',
  'mail',
  'ftp',
  'cdn',
]);

@Injectable()
export class PortfoliosService {
  constructor(
    @InjectRepository(PortfolioEntity)
    private readonly portfoliosRepository: Repository<PortfolioEntity>,
    @InjectRepository(PortfolioContentEntity)
    private readonly contentRepository: Repository<PortfolioContentEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async isSubdomainAvailable(subdomain: string): Promise<boolean> {
    const normalized = subdomain.trim().toLowerCase();
    if (reservedSubdomains.has(normalized)) return false;
    return !(await this.portfoliosRepository.existsBy({
      subdomain: normalized,
    }));
  }

  async create(
    ownerId: string,
    input: {
      subdomain: string;
      theme?: PortfolioTheme;
      blocks?: PortfolioBlock[];
    },
  ) {
    const subdomain = input.subdomain.trim().toLowerCase();
    if (!(await this.isSubdomainAvailable(subdomain))) {
      throw new ConflictException('Subdomain is unavailable');
    }

    return this.dataSource.transaction(async (manager) => {
      const portfolios = manager.getRepository(PortfolioEntity);
      const contentVersions = manager.getRepository(PortfolioContentEntity);
      const portfolio = await portfolios.save(
        portfolios.create({
          owner: { id: ownerId } as UserEntity,
          subdomain,
          status: 'draft',
          theme: input.theme ?? { id: 'minimal', accentColor: '#e06b24' },
        }),
      );
      const content = await contentVersions.save(
        contentVersions.create({
          portfolio,
          version: 1,
          blocks: input.blocks ?? [],
          isPublished: false,
        }),
      );
      return { ...portfolio, content };
    });
  }

  async findMine(ownerId: string) {
    const portfolios = await this.portfoliosRepository.find({
      where: { owner: { id: ownerId } },
      relations: { contentVersions: true },
      order: { updatedAt: 'DESC' },
    });
    return portfolios.map((portfolio) => this.toPortfolioResponse(portfolio));
  }

  async findOne(ownerId: string, id: string) {
    const portfolio = await this.portfoliosRepository.findOne({
      where: { id, owner: { id: ownerId } },
      relations: { contentVersions: true },
    });
    if (!portfolio) throw new NotFoundException('Portfolio not found');
    return this.toPortfolioResponse(portfolio);
  }

  async update(
    ownerId: string,
    id: string,
    input: { theme?: PortfolioTheme; blocks?: PortfolioBlock[] },
  ) {
    await this.dataSource.transaction(async (manager) => {
      const portfolios = manager.getRepository(PortfolioEntity);
      const contentVersions = manager.getRepository(PortfolioContentEntity);
      const portfolio = await portfolios.findOne({
        where: { id, owner: { id: ownerId } },
        relations: { contentVersions: true },
      });
      if (!portfolio) throw new NotFoundException('Portfolio not found');

      if (input.theme !== undefined) portfolio.theme = input.theme;
      const savedPortfolio = await portfolios.save(portfolio);

      if (input.blocks !== undefined) {
        const latestVersion = portfolio.contentVersions.reduce(
          (latest, content) => Math.max(latest, content.version),
          0,
        );
        await contentVersions.save(
          contentVersions.create({
            portfolio: savedPortfolio,
            version: latestVersion + 1,
            blocks: input.blocks,
            isPublished: false,
          }),
        );
      }
    });
    return this.findOne(ownerId, id);
  }

  async remove(ownerId: string, id: string): Promise<void> {
    const result = await this.portfoliosRepository.delete({
      id,
      owner: { id: ownerId },
    });
    if (!result.affected) throw new NotFoundException('Portfolio not found');
  }

  async publish(ownerId: string, id: string) {
    await this.dataSource.transaction(async (manager) => {
      const portfolios = manager.getRepository(PortfolioEntity);
      const contentVersions = manager.getRepository(PortfolioContentEntity);
      const portfolio = await portfolios.findOne({
        where: { id, owner: { id: ownerId } },
        relations: { contentVersions: true },
      });
      if (!portfolio) throw new NotFoundException('Portfolio not found');

      const latestDraft =
        portfolio.contentVersions.reduce<PortfolioContentEntity | null>(
          (latest, content) =>
            !latest || content.version > latest.version ? content : latest,
          null,
        );
      if (!latestDraft || latestDraft.blocks.length === 0) {
        throw new ConflictException('Add portfolio content before publishing');
      }

      latestDraft.isPublished = true;
      portfolio.status = 'published';
      await contentVersions.save(latestDraft);
      await portfolios.save(portfolio);
    });
    return this.findOne(ownerId, id);
  }

  async unpublish(ownerId: string, id: string) {
    const portfolio = await this.portfoliosRepository.findOneBy({
      id,
      owner: { id: ownerId },
    });
    if (!portfolio) throw new NotFoundException('Portfolio not found');
    portfolio.status = 'unpublished';
    await this.portfoliosRepository.save(portfolio);
    return this.findOne(ownerId, id);
  }

  private toPortfolioResponse(portfolio: PortfolioEntity) {
    const content = [...(portfolio.contentVersions ?? [])].sort(
      (left, right) => right.version - left.version,
    );
    return {
      id: portfolio.id,
      subdomain: portfolio.subdomain,
      status: portfolio.status,
      theme: portfolio.theme,
      updatedAt: portfolio.updatedAt,
      content: content[0] ?? null,
    };
  }
}
