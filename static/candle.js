class CandleHandler {
  reset() {
    this.candleSeries.setData(this.data);
  }

  push(data) {
    this.data.concat(data);
    this.reset();
  }

  createChart() {
    var terminal = document.querySelector('.terminal');
    return LightweightCharts.createChart(terminal, {
      width: terminal.scrollWidth,
      height: 768,
      crosshair: {
        mode: LightweightCharts.CrosshairMode.Normal,
      },
      // priceScale: {
      //   scaleMargins: {
      //     top: 0.3,
      //     bottom: 0.25,
      //   },
      //   borderVisible: false,
      // },
      layout: {
        backgroundColor: '#131722',
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: {
          color: 'rgba(42, 46, 57, 0)',
        },
        horzLines: {
          color: 'rgba(42, 46, 57, 0.6)',
        },
      },
    });
  }

  init(data) {
    this.data = data;
    this.chart = this.createChart();
    this.candleSeries = this.chart.addCandlestickSeries();
    this.candleSeries.setData(this.data);
    this.candleSeries.applyOptions({
      priceFormat: {
        type: 'price',
        precision: 4,
        minMove: 0.0001,
      },
    });
    this.priceLines = [];
  }

  applyOptions(opts) {
    this.chart && this.chart.applyOptions(opts);
  }

  showOrderBooks(newOrderBooks) {
    const asks = newOrderBooks.asks;
    const bids = newOrderBooks.bids;
    var lineWidth = 0.1;

    this.hideOrderBooks();

    Object.keys(asks).forEach((ask) => {
      var minPriceLine = {
        price: ask,
        color: '#be1238',
        lineWidth: lineWidth,
        lineStyle: LightweightCharts.LineStyle.Solid,
        axisLabelVisible: true,
        title: parseInt(asks[ask] * ask),
      };
      const priceLine = this.candleSeries.createPriceLine(minPriceLine);
      this.priceLines.push(priceLine);
    });

    Object.keys(bids).forEach((bid) => {
      var minPriceLine = {
        price: bid,
        color: 'rgb(20, 214, 20)',
        lineWidth: lineWidth,
        lineStyle: LightweightCharts.LineStyle.Solid,
        axisLabelVisible: true,
        title: parseInt(bids[bid] * bid),
      };
      const priceLine = this.candleSeries.createPriceLine(minPriceLine);
      this.priceLines.push(priceLine);
    });
    this.chart.timeScale();
    //.fitContent();
  }

  hideOrderBooks() {
    this.priceLines.forEach((p) => this.candleSeries.removePriceLine(p));
    this.priceLines = [];
  }
}

window.chart = new CandleHandler();

// Make Chart Responsive with screen resize
const terminal = document.querySelector('.terminal');
new ResizeObserver((entries) => {
  if (entries.length === 0 || entries[0].target !== terminal) {
    return;
  }
  const newRect = entries[0].contentRect;
  window.chart.applyOptions({
    height: newRect.height,
    width: newRect.width,
  });
}).observe(terminal);
