import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaAssetEntity } from '../database/entities/media-asset.entity';
import { PortfolioEntity } from '../database/entities/portfolio.entity';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';

@Module({
  imports: [TypeOrmModule.forFeature([PortfolioEntity, MediaAssetEntity])],
  controllers: [MediaController],
  providers: [MediaService],
})
export class MediaModule {}
