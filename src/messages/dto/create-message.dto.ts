import { Parameter } from '../entities/parameter.entity';
import { Slot } from '../entities/slot.entity';

export class CreateMessageDto {
  sender: string;
  message: string;
  bot_name: string;
  channel: string;
  upload_outgoing_params: boolean;
  get_context: boolean;
  analyze: boolean;
  parameters: Parameter[];
  load_slots: Slot[];
}
