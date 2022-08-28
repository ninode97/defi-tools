import { Injectable, Logger } from '@nestjs/common';
import { BinanceClient, Candle, CandlePeriod, Ticker } from 'ccxws';
import * as cctx from 'ccxt';
import { writeFileSync } from 'fs';
import { HttpService } from '@nestjs/axios';
import * as WebSocket from 'ws';
import { promisify } from 'util';

const sleep = promisify(setTimeout);

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
  constructor(private readonly httpService: HttpService) {
    this.tickers = {};
    this.initBinance();
    this.confugreXRPTickerSocket();
    this.getCandleStickData();
  }

  get candleData() {
    return this.candle;
  }

  private candle: any[] = [];
  private binance: BinanceClient;
  private logger: Logger = new Logger('ExchangeProvider');
  private tickers: ExchangeTickers = {};
  private binanceExchange = new cctx.binance();

  get allTickers() {
    return this.tickers;
  }

  get ORDER_BOOK_LIMIT() {
    return 1000 * 1000 * 1000;
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
      const market = this.watchedCurrencies[currency];
      this.binance.subscribeTicker(market);
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

  async getOrderBooks() {
    const data = await this.binanceExchange.fetchOrderBook(
      'XRP/USDT',
      this.ORDER_BOOK_LIMIT,
    );
    return data;
  }

  async confugreXRPTickerSocket() {
    // const ws = new WebSocket(
    //   'wss://stream.binance.com:9443/ws/xrpusdt@kline_1M',
    // );
    // ws.on('message', (data: string) => {
    //   if (data) {
    //     const trade = JSON.parse(data); // parsing single-trade record
    //     console.log(trade);
    //   }
    // });
    // const d = await this.httpService.axiosRef.get(
    //   'https://api.binance.com/api/v3/klines?symbol=XRPUSDT&interval=1m',
    // );
    // ///https://api.binance.com/api/v3/uiKlines?symbol=XRPUSDT&interval
    // const data = d.data;
    // console.log(d);
  }

  async getCandleStickData() {
    console.log('fetching xrp candle');
    let candle = [];
    const endpoint = `https://api.binance.com/api/v3/uiKlines?symbol=XRPUSDT&interval=1w`;
    let startTime = 1;
    while (true) {
      this.logger.log('Fetching XRP candle - Time' + startTime);
      const target = endpoint + `&startTime=` + startTime;
      const res = await this.httpService.axiosRef.get(target);
      const data = res.data;
      if (!data || data.length === 0) break;
      const lastCandle = data[data.length - 1];
      candle = [...candle, ...data];
      if (lastCandle[0] === startTime) {
        break;
      }
      startTime = lastCandle[0];
      await sleep(250);
    }
    const d = this.transformCandleStickIntoFriendlyFormat(candle);
    console.log(d);
    this.candle = d;
  }

  transformCandleStickIntoFriendlyFormat(candle) {
    //  { time: '2019-05-28', open: 59.21, high: 59.66, low: 59.02, close: 59.57 },
    //{ time: { year: 2018, month: 1, day: 1 }, value: 27.58405298746434 },

    // [
    //0   1499040000000,      // Kline open time
    //1   "0.01634790",       // Open price
    //2   "0.80000000",       // High price
    //3   "0.01575800",       // Low price
    //4   "0.01577100",       // Close price
    //5   "148976.11427815",  // Volume
    //6   1499644799999,      // Kline Close time
    //7   "2434.19055334",    // Quote asset volume
    //8   308,                // Number of trades
    //9   "1756.87402397",    // Taker buy base asset volume
    //10   "28.46694368",      // Taker buy quote asset volume
    //11   "0"                 // Unused field, ignore.
    // ]

    const d = {};
    candle.forEach((c) => {
      const timestamp = c[6];
      const openPrice = Number(c[1]);
      const highPrice = Number(c[2]);
      const lowPrice = Number(c[3]);
      const closePrice = Number(c[4]);
      const entry = {
        [timestamp]: {
          time: timestamp,
          open: openPrice,
          high: highPrice,
          low: lowPrice,
          close: closePrice,
        },
      };
      Object.assign(d, entry);
    });
    const DATE = Date as any;
    return Object.values(d);
  }
}
