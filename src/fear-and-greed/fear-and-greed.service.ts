import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Interval } from '@nestjs/schedule';
import { Model } from 'mongoose';
import { MS_TIME } from 'src/constants';
import {
  FearAndGreedIndex,
  FearAndGreedIndexDocument,
} from './schemas/fear-and-greed-index.schema';

type FearAndGreedIndexEntry = {
  value: string;
  value_classification: string;
  timestamp: string;
  time_until_update?: string;
};

type FearAndGreedIndexResponse = {
  name: string;
  data: FearAndGreedIndexEntry[];
};

@Injectable()
export class FearAndGreedService {
  private readonly logger = new Logger('FearAndGreedService');
  constructor(
    @InjectModel(FearAndGreedIndex.name)
    private readonly model: Model<FearAndGreedIndexDocument>,
    private readonly httpService: HttpService,
  ) {
    this.logger.log('Initializing FearAndGreedService');
    this.sync();
  }
  async fetchGreedIndex(): Promise<FearAndGreedIndexEntry[]> {
    const res = await this.httpService.axiosRef.get<FearAndGreedIndexResponse>(
      'https://api.alternative.me/fng/?limit=0',
    );
    return this.sortByTimestamp((res.data && res.data.data) || []);
  }

  sortByTimestamp(data: FearAndGreedIndexEntry[]) {
    return data.sort(
      (a, b) => Number(a.timestamp) * 1000 - Number(b.timestamp) * 1000,
    );
  }

  async getLastEntry() {
    const entry = await this.model.findOne(
      {},
      {},
      {
        sort: {
          _id: -1,
        },
        limit: 1,
      },
    );
    return entry;
  }

  hasMissingEntries(lastEntry: FearAndGreedIndex) {
    const lastTimestamp = Number(lastEntry.timestamp) * 1000;
    const days = Math.abs(lastTimestamp - Date.now()) / MS_TIME.DAY;
    this.logger.log({ days });
    return days >= 1;
  }

  async getEntryCount() {
    return this.model.countDocuments({});
  }

  @Interval(MS_TIME.HOUR)
  async sync() {
    this.logger.log(`Syncing fear and greed index`);
    try {
      const lastEntry = await this.getLastEntry();
      if (!lastEntry) {
        const entries = await this.fetchGreedIndex();
        await this.model.bulkSave(entries.map((e) => new this.model(e)));
        return;
      }
      const hasMissing = this.hasMissingEntries(lastEntry);
      this.logger.log({ hasMissing });
      if (!hasMissing) return;

      const entries = await this.fetchGreedIndex();
      const count = await this.getEntryCount();
      const newEntries = this.sortByTimestamp(entries.splice(count));
      await this.bulkAddEntries(newEntries);
    } catch (error) {
      this.logger.error(
        `Failed to fetch fear and greed index - ${error.message}`,
      );
    }
  }

  async bulkAddEntries(entries: FearAndGreedIndexEntry[]) {
    try {
      await this.model.bulkSave(entries.map((e) => new this.model(e)));
    } catch (error) {
      this.logger.error('Failed to add entries in bulk...');
    }
  }
}
