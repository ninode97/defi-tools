export type MappedCandle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

export class CandleStack {
  private data: MappedCandle[] = [];

  add(candle: MappedCandle) {
    this.data.push(candle);
  }

  drain() {
    const d = [...this.data];
    this.data = [];
    return d;
  }
}
