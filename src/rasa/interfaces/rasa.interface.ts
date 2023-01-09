export interface RasaRequest {
  sender: string;
  message: string;
  botName: string;
  customData?: {
    language?: string;
  };
}

export interface RasaResponse {
  recipient_id: string;
  text: string;
  metadata?: any;
}
