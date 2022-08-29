class CandleHandler {
  reset() {
    this.candleSeries.setData(this.data);
  }

  push(data) {
    this.data.concat(data);
    this.reset();
  }

  createChart() {
    return LightweightCharts.createChart(
      document.body.querySelector('.terminal'),
      {
        width: 600,
        height: 300,
        crosshair: {
          mode: LightweightCharts.CrosshairMode.Normal,
        },
      },
    );
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
  }

  applyOptions(opts) {
    this.chart && this.chart.applyOptions(opts);
  }

  updatePressureLevels() {
    var lineWidth = 1;
    var minPriceLine = {
      price: 0.25,
      color: '#be1238',
      lineWidth: lineWidth,
      lineStyle: LightweightCharts.LineStyle.Solid,
      axisLabelVisible: true,
      title: 'minimum price',
    };
    // var avgPriceLine = {
    //   price: avgPrice,
    //   color: '#be1238',
    //   lineWidth: lineWidth,
    //   lineStyle: LightweightCharts.LineStyle.Solid,
    //   axisLabelVisible: true,
    //   title: 'average price',
    // };
    // var maxPriceLine = {
    //   price: maximumPrice,
    //   color: '#be1238',
    //   lineWidth: lineWidth,
    //   lineStyle: LightweightCharts.LineStyle.Solid,
    //   axisLabelVisible: true,
    //   title: 'maximum price',
    // };

    this.candleSeries.createPriceLine(minPriceLine);
    // this.candleSeries.createPriceLine(avgPriceLine);
    // this.candleSeries.createPriceLine(maxPriceLine);

    this.chart.timeScale().fitContent();
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
