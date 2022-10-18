export class CreateMessageDto {
  sender: string;
  message: string;
  bot_name: string;
  channel: string;
  upload_outgoing_params: boolean;
  get_context: boolean;
  analyze: boolean;
  slots_to_load: string[];
}
