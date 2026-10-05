import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CardTapEntity } from '../database/entities/card-tap.entity';
import { NfcOrderEntity } from '../database/entities/nfc-order.entity';
import { PortfolioEntity } from '../database/entities/portfolio.entity';
import { NfcOrdersController } from './nfc-orders.controller';
import { NfcOrdersService } from './nfc-orders.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([NfcOrderEntity, CardTapEntity, PortfolioEntity]),
  ],
  controllers: [NfcOrdersController],
  providers: [NfcOrdersService],
})
export class NfcOrdersModule {}
