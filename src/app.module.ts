import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { LedgerGateway } from './ledger/ledger.gateway';
import { Conf } from './conf';
import { Exchange } from './exchange/exchange';
import { XRPLedgerExplorer } from './explorers/xrp-explorer';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    // ServeStaticModule.forRoot({
    //   rootPath: join(__dirname, '..', 'client'),
    // }),
  ],
  controllers: [],
  providers: [LedgerGateway, Conf, Exchange, XRPLedgerExplorer],
})
export class AppModule {}
