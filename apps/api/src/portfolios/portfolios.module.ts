import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PortfolioContentEntity } from '../database/entities/portfolio-content.entity';
import { PortfolioEntity } from '../database/entities/portfolio.entity';
import { PortfoliosController } from './portfolios.controller';
import { PortfoliosService } from './portfolios.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PortfolioEntity, PortfolioContentEntity]),
  ],
  controllers: [PortfoliosController],
  providers: [PortfoliosService],
})
export class PortfoliosModule {}
