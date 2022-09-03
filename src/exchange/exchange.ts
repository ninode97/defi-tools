import { Injectable, Logger } from '@nestjs/common';
import { BinanceClient, Candle, CandlePeriod, Ticker } from 'ccxws';
import * as cctx from 'ccxt';
import { writeFileSync } from 'fs';
import { HttpService } from '@nestjs/axios';
import * as WebSocket from 'ws';
import { promisify } from 'util';
import { CandleStack, MappedCandle } from 'src/data-structures/candle-stack';

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
    this.getCandleStickData();
  }

  private diff = {
    bids: {},
    asks: {},
    capture(key, price, reduced) {
      const data = this[key];
      const target = data[price] || [];
      target.push(reduced);
      data[price] = target;
    },
    get() {
      return JSON.stringify(
        {
          bids: this.bids,
          asks: this.asks,
        },
        null,
        4,
      );
    },
  };

  get candleData() {
    return this.candle;
  }

  private candle: any[] = [];
  private binance: BinanceClient;
  private logger: Logger = new Logger('ExchangeProvider');
  private tickers: ExchangeTickers = {};
  private binanceExchange = new cctx.binance();
  public stack = new CandleStack();

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
    this.logger.log('getting order book');
    const data = await this.binanceExchange.fetchOrderBook(
      'XRP/USDT',
      this.ORDER_BOOK_LIMIT,
    );
    const projection = {
      asks: {},
      bids: {},
    };

    data.bids.forEach((bid) => {
      const realPrice = bid[0];
      const amount = parseInt(`${bid[1]}`);
      const volume = realPrice * amount;
      const priceTarget = Math.round((bid[0] + Number.EPSILON) * 100) / 100;
      if (volume < 1000 * 5) {
        return;
      } else if (!priceTarget) {
        projection.bids[realPrice] = projection.bids[realPrice] || 0;
        projection.bids[realPrice] += amount;
      } else if (volume > 1000 * 1000) {
        projection.bids[realPrice] = projection.bids[realPrice] || 0;
        projection.bids[realPrice] += amount;
      } else if (volume > 1000 * 20) {
        projection.bids[priceTarget] = projection.bids[priceTarget] || 0;
        projection.bids[priceTarget] += amount;
      }
    });
    data.asks.forEach((ask) => {
      const realPrice = ask[0];
      const amount = parseInt(`${ask[1]}`);
      const volume = realPrice * amount;
      const priceTarget = Math.round((ask[0] + Number.EPSILON) * 100) / 100;

      if (volume < 1000 * 5) {
        return;
      } else if (!priceTarget) {
        projection.asks[realPrice] = projection.asks[realPrice] || 0;
        projection.asks[realPrice] += amount;
      } else if (volume > 1000 * 1000) {
        projection.asks[realPrice] = projection.asks[realPrice] || 0;
        projection.asks[realPrice] += amount;
      } else if (volume > 1000 * 20) {
        projection.asks[priceTarget] = projection.asks[priceTarget] || 0;
        projection.asks[priceTarget] += amount;
      }
    });
    //writeFileSync('./test.json', this.diff.get());

    return projection;
  }

  async confugreXRPTickerSocket() {
    // {
    //   "e": "kline",     // Event type
    //   "E": 123456789,   // Event time
    //   "s": "BNBBTC",    // Symbol
    //   "k": {
    //     "t": 123400000, // Kline start time
    //     "T": 123460000, // Kline close time
    //     "s": "BNBBTC",  // Symbol
    //     "i": "1m",      // Interval
    //     "f": 100,       // First trade ID
    //     "L": 200,       // Last trade ID
    //     "o": "0.0010",  // Open price
    //     "c": "0.0020",  // Close price
    //     "h": "0.0025",  // High price
    //     "l": "0.0015",  // Low price
    //     "v": "1000",    // Base asset volume
    //     "n": 100,       // Number of trades
    //     "x": false,     // Is this kline closed?
    //     "q": "1.0000",  // Quote asset volume
    //     "V": "500",     // Taker buy base asset volume
    //     "Q": "0.500",   // Taker buy quote asset volume
    //     "B": "123456"   // Ignore
    //   }
    // }
    const ws = new WebSocket(
      'wss://stream.binance.com:9443/ws/xrpusdt@kline_1w',
    );
    ws.on('message', (data: string) => {
      if (data) {
        const trade = JSON.parse(data); // parsing single-trade record
        const candle: MappedCandle = {
          time: trade.k.T,
          open: Number(trade.k.o),
          high: Number(trade.k.h),
          low: Number(trade.k.l),
          close: Number(trade.k.c),
        };
        this.stack.add(candle);
      }
    });
  }

  async getCandleStickData() {
    let candle = [];
    const endpoint = `https://api.binance.com/api/v3/uiKlines?symbol=XRPUSDT&interval=1w`;
    let startTime = 1;
    while (true) {
      this.logger.log('Fetching XRP candle - Time ' + startTime);
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
    this.candle = d;
    this.confugreXRPTickerSocket();
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
      //  const timestamp = Math.round(new Date(c[6]).getTime() / 1000);
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
    return Object.values(d);
  }
}
