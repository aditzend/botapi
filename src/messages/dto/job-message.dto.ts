export class JobMessageDto {
  recipient_id: string;
  bot_name: string;
  client_message: string;
  bot_responses: object[];
  channel: string;
  context?: object;
  sent_at: Date;
  analytics?: {
    processor?: string;
    group?: string;
  };
}
