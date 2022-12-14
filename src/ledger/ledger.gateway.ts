import { Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Conf, WalletAddress } from 'src/conf';
import { Exchange, WATCHED_CURRENCIES } from 'src/exchange/exchange';
import { XRPLedgerExplorer } from 'src/explorers/xrp-explorer';
import { FearAndGreedService } from 'src/fear-and-greed/fear-and-greed.service';

type CurrencyBalance = {
  [currency: string]: number;
};

@WebSocketGateway({
  namespace: 'ledger',
})
export class LedgerGateway implements OnGatewayInit {
  //private readonly balances: CurrencyBalance = {};
  constructor(
    private readonly conf: Conf,
    private readonly xrpLedgerExplorer: XRPLedgerExplorer,
    private readonly exchange: Exchange,
    private readonly fearGreedService: FearAndGreedService,
  ) {}

  private fearGreed = {
    label: 'loading',
    value: '0',
  };

  get balances(): CurrencyBalance {
    let allXrp = 0;
    this.xrpLedgerExplorer.wallets.forEach(
      (w) => (allXrp += Number(w.balance || 0)),
    );

    return {
      [WATCHED_CURRENCIES.XRP]: allXrp,
    };
  }

  @WebSocketServer() wss: Server;
  private logger: Logger = new Logger('LedgerGateway');

  async afterInit(server: any) {
    this.logger.log('Initialized');
    const data = await this.fearGreedService.getLastEntry();
    this.fearGreed = {
      label: data.value_classification,
      value: data.value,
    };
  }

  @SubscribeMessage('client:checkState')
  async handleMessage(client: any, payload: any) {
    this.wss.emit('server:updateState', {
      balances: this.balances,
      tickers: this.exchange.allTickers,
      candle: this.exchange.candleData,
      greed: this.fearGreed,
    });
  }

  @Cron('* * 1 * * *')
  async syncWallets() {
    this.logger.log('Syncing XRP Wallet Balances');
    await this.xrpLedgerExplorer.syncBalances();
    this.wss.emit('server:refreshBalances', {
      balances: this.balances,
    });
  }

  @Cron('10 * * * * *')
  syncPrices() {
    this.logger.log('Refreshing prices');
    this.wss.emit('server:refreshPrices', {
      tickers: this.exchange.allTickers,
    });
  }

  @Cron('5 * * * * *')
  logState() {
    // this.logger.log(this.balances);
    // this.logger.log(this.exchange.allTickers);
  }

  @Cron('3 * * * * *')
  async getOrderBooks() {
    this.logger.log('Refreshing order books');
    const data = await this.exchange.getOrderBooks();
    console.log(data);
    this.wss.emit('server:refreshOrderBooks', {
      orderBooks: data,
    });
  }

  // @Cron('* * * * * *')
  // updateCandle() {
  //   this.logger.log('Updating candle....');
  //   const data = this.exchange.stack.drain();
  //   this.wss.emit('server:updateCandle', {
  //     candle: data,
  //   });
  // }
}
