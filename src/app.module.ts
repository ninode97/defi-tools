import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { LedgerGateway } from './ledger/ledger.gateway';
import { Conf } from './conf';
import { Exchange } from './exchange/exchange';
import { XRPLedgerExplorer } from './explorers/xrp-explorer';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
import { FearAndGreedModule } from './fear-and-greed/fear-and-greed.module';
import { FearAndGreedService } from './fear-and-greed/fear-and-greed.service';

@Module({
  imports: [
    MongooseModule.forRoot('mongodb://localhost:27017/price_discovery'),
    HttpModule,
    ScheduleModule.forRoot(),
    FearAndGreedModule,
  ],
  controllers: [],
  providers: [LedgerGateway, Conf, Exchange, XRPLedgerExplorer],
})
export class AppModule {}
