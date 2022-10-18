export class SendJobDto {
  queueName: string;
  data: {
    interaction_id: string;
    bot_name: string;
    message: string;
    events: object[];
    context: object;
    channel: string;
    sentAt: string;
  };
}
