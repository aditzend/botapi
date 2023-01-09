import { IsNotEmpty } from 'class-validator';

export class CreateRasaMessageDto {
  @IsNotEmpty()
  sender: string;

  @IsNotEmpty()
  message: string;

  @IsNotEmpty()
  botName: string;

  customData?: {
    language?: string;
  };
}
