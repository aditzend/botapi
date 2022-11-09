export class ResponseCreateMessageDto {
  recipient_id: string;
  bot_name: string;
  channel: string;
  context?: object;
  events: object[];
  status: {
    pushed_to_analytics_queue: boolean;
    outgoing_params_uploaded: boolean;
    initial_slots_loaded: boolean;
  };
}
