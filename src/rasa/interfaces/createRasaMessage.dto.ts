import { IsNotEmpty } from 'class-validator';

export class CreateRasaMessageDto {
  @IsNotEmpty()
  sender: string;

  @IsNotEmpty()
  message: string;

  @IsNotEmpty()
  bot_name: string;
}
