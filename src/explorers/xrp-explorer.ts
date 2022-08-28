import { Injectable, Logger } from '@nestjs/common';
import { Conf, WalletAddress } from 'src/conf';
import * as XRPL from 'xrpl';

@Injectable()
export class XRPLedgerExplorer {
  private xrpl: XRPL.Client;
  private xrplInitialized = false;
  private logger: Logger = new Logger('XRPExplorer');
  constructor(private readonly conf: Conf) {
    this.initXRPL();
  }

  get wallets() {
    return this.conf.configuration.xrpWallets || [];
  }

  initXRPL() {
    this.xrpl = new XRPL.Client('wss://xrplcluster.com/');
    this.xrpl
      .connect()
      .then(async () => {
        this.xrplInitialized = true;
        this.logger.log('XRPL Initialized');
        await this.syncBalances();
      })
      .catch((err) => {
        this.logger.error(err);
      });
  }

  async syncBalances() {
    for await (const wallet of this.conf.configuration.xrpWallets) {
      const balance = await this.checkBalance(wallet);
      wallet.balance = balance;
    }
  }

  async checkBalance(wallet: WalletAddress) {
    if (this.xrplInitialized) {
      const response = await this.xrpl.request({
        command: 'account_info',
        account: wallet.address,
        ledger_index: 'validated',
      });
      const balance = response.result.account_data.Balance;
      return XRPL.dropsToXrp(balance);
    } else {
      this.logger.log('XRPL not initialized...');
    }
  }
}
