Vue.component('alerts-component', VueSimpleNotify.VueSimpleNotify);
var app = new Vue({
  el: '#v-app',
  data: {
    username: '',
    title: 'Websockets Tester',
    text: '',
    socket: {
      ledger: null,
    },
    alerts: [],
    state: {
      balances: {},
      tickers: {},
      candle: [],
      greed: {
        label: 'Loading',
        value: '0',
      },
    },
    orderBooks: {},
    pricesZones: false,
  },
  methods: {
    checkState() {
      this.socket.ledger.emit('client:checkState');
    },
    updateState(state) {
      Object.assign(this.state, state);
      if (this.state.candle && this.state.candle.length > 0) {
        window.chart.init(this.state.candle);
      }
    },
    refreshPrices(data) {
      console.log(data);
      this.tickers = data.tickers;
    },
    refreshBalances(data) {
      console.log(data);
      this.state.balances = data.balances;
    },
    refreshOrderBooks(data) {
      console.log(data);
      this.orderBooks = data.orderBooks;
    },
    toggleZones() {
      if (this.pricesZones) {
        window.chart.showOrderBooks(this.orderBooks);
      } else {
        window.chart.hideOrderBooks();
      }
      this.pricesZones = !this.pricesZones;
    },
    updateCandle(data) {
      const chart = window.chart;
      chart && chart.updateChartCandles(data);
    },
  },
  computed: {
    balanceWorth() {
      let total = 0;
      for (const b of this.iterableBalances) {
        const ticker = this.state.tickers[b.currency];
        if (!ticker) continue;
        total = currency(total).add(b.balance).multiply(ticker.price);
      }
      return total;
    },
    iterableBalances() {
      const keys = Object.keys(this.state.balances);
      const balances = this.state.balances;
      return keys.map((k) => ({ currency: k, balance: balances[k] }));
    },
    bids() {
      const orderBooks = this.orderBooks || {};
      const bids = orderBooks.bids || {};
      return Object.keys(bids).length;
    },
    asks() {
      const orderBooks = this.orderBooks || {};
      const asks = orderBooks.asks || {};
      return Object.keys(asks).length;
    },
  },
  watch: {
    // whenever question changes, this function will run
    // orderBooks(newOrderBooks) {
    //   window.chart.updateOrderBooks(newOrderBooks);
    // },
  },
  created() {
    this.socket.ledger = io('http://127.0.0.1:3000/ledger', {});
    this.socket.ledger.on('server:updateState', this.updateState);
    this.socket.ledger.on('server:refreshPrices', this.refreshPrices);
    this.socket.ledger.on('server:refreshBalances', this.refreshBalances);
    this.socket.ledger.on('server:refreshOrderBooks', this.refreshOrderBooks);
    this.socket.ledger.on('server:updateCandle', this.updateCandle);
    this.socket.ledger.on('connect', () => {
      console.log('connect');
      this.checkState();
    });
  },
});
