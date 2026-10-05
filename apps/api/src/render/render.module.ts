import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PortfolioEntity } from '../database/entities/portfolio.entity';
import { RenderController } from './render.controller';
import { RenderService } from './render.service';

@Module({
  imports: [TypeOrmModule.forFeature([PortfolioEntity])],
  controllers: [RenderController],
  providers: [RenderService],
})
export class RenderModule {}
