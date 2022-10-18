export interface RasaRequest {
  sender: string;
  message: string;
  bot_name: string;
}

export interface RasaResponse {
  recipient_id: string;
  text: string;
  metadata?: any;
}
