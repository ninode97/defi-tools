import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type FearAndGreedIndexDocument = FearAndGreedIndex & Document;

@Schema()
export class FearAndGreedIndex {
  @Prop({
    required: true,
  })
  value: string;

  @Prop({
    required: true,
  })
  value_classification: string;

  @Prop({
    required: true,
    unique: true,
  })
  timestamp: string;

  @Prop({
    required: false,
  })
  time_until_update: string;
}

export const FearAndGreedIndexSchema =
  SchemaFactory.createForClass(FearAndGreedIndex);
