import { Slot } from '../entities/slot.entity';

export class LoadSlotsDto {
  sender: string;
  bot_name: string;
  load_slots: Slot[];
}
