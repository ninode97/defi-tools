import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { resolve } from 'path';

export type WalletAddress = {
  name: string;
  address: string;
  balance?: string;
};
type Configuration = {
  addresses: WalletAddress[];
  xrp: string;
  xrpWallets: WalletAddress[];
  hbarWallets: WalletAddress[];
};

@Injectable()
export class Conf {
  private conf;
  constructor() {
    const pathToConf = resolve('./conf.json');
    const text = readFileSync(pathToConf, { encoding: 'utf8' });
    this.conf = JSON.parse(text);
    console.log(this.conf);
  }

  get configuration(): Configuration {
    return this.conf;
  }
}
