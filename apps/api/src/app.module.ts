import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { dataSourceOptions } from './database/data-source';
import { PortfoliosModule } from './portfolios/portfolios.module';
import { RenderModule } from './render/render.module';
import { MediaModule } from './media/media.module';
import { NfcOrdersModule } from './nfc-orders/nfc-orders.module';

@Module({
  imports: [
    AuthModule,
    PortfoliosModule,
    RenderModule,
    MediaModule,
    NfcOrdersModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['apps/api/.env', '.env'],
    }),
    TypeOrmModule.forRoot(dataSourceOptions),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
