import { Injectable, Logger } from '@nestjs/common';
import { BinanceClient, Candle, CandlePeriod, Ticker } from 'ccxws';

export enum WATCHED_CURRENCIES {
  XRP = 'XRP',
  BTC = 'BTC',
}

export const EXCHANGE_MARKETS = {
  [WATCHED_CURRENCIES.XRP]: {
    id: 'XRPUSDT',
    base: 'XRP',
    quote: 'USDT',
  },
  [WATCHED_CURRENCIES.BTC]: {
    id: 'BTCUSDT',
    base: 'BTC',
    quote: 'USDT',
  },
};

type ExchangeTickers = {
  [currency: string]: {
    quote: string;
    price: string;
  };
};

@Injectable()
export class Exchange {
  private binance: BinanceClient;
  private logger: Logger = new Logger('ExchangeProvider');
  private tickers: ExchangeTickers = {};

  get allTickers() {
    return this.tickers;
  }

  constructor() {
    this.tickers = {};
    this.initBinance();
  }

  get watchedCurrencies() {
    return {
      [WATCHED_CURRENCIES.XRP]: EXCHANGE_MARKETS[WATCHED_CURRENCIES.XRP],
      [WATCHED_CURRENCIES.BTC]: EXCHANGE_MARKETS[WATCHED_CURRENCIES.BTC],
    };
  }

  initBinance() {
    this.binance = new BinanceClient();
    this.binance.candlePeriod = CandlePeriod._1m;
    this.registerListeners();
  }

  registerListeners() {
    const currencies = Object.keys(this.watchedCurrencies);
    this.binance.on('ticker', this.onTickerUpdate.bind(this));
    currencies.forEach((currency) => {
      this.binance.subscribeTicker(this.watchedCurrencies[currency]);
    });
  }

  onTickerUpdate(ticker: Ticker) {
    const update = {
      [ticker.base]: {
        price: ticker.last,
        quote: ticker.quote,
      },
    };
    Object.assign(this.tickers, update);
  }
}
