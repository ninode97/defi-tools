import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FearAndGreedService } from './fear-and-greed.service';
import {
  FearAndGreedIndex,
  FearAndGreedIndexSchema,
} from './schemas/fear-and-greed-index.schema';

@Module({
  providers: [FearAndGreedService],
  imports: [
    HttpModule,
    MongooseModule.forFeature([
      {
        name: FearAndGreedIndex.name,
        schema: FearAndGreedIndexSchema,
      },
    ]),
  ],
})
export class FearAndGreedModule {}
