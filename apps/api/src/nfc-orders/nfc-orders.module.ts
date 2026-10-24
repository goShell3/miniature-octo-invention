import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CardTapEntity } from '../database/entities/card-tap.entity';
import { NfcOrderEntity } from '../database/entities/nfc-order.entity';
import { PortfolioEntity } from '../database/entities/portfolio.entity';
import { UserEntity } from '../database/entities/user.entity';
import { ChekiService } from './cheki.service';
import { NfcOrdersController } from './nfc-orders.controller';
import { NfcOrdersService } from './nfc-orders.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([NfcOrderEntity, CardTapEntity, PortfolioEntity, UserEntity]),
  ],
  controllers: [NfcOrdersController],
  providers: [NfcOrdersService, ChekiService],
  exports: [NfcOrdersService, ChekiService],
})
export class NfcOrdersModule {}
