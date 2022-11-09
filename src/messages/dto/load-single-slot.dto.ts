import { Slot } from '../entities/slot.entity';

export class LoadSingleSlotDto {
  sender: string;
  bot_name: string;
  slot: Slot;
}
