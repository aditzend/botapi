import { Injectable, Logger } from '@nestjs/common';
import { MessageProcessorService } from 'src/message-processor/message-processor.service';
import { CreateMessageDto } from './dto/create-message.dto';

@Injectable()
export class MessagesService {
  constructor(private readonly messageProcessor: MessageProcessorService) {}

  logger: Logger = new Logger('MessagesService');

  /**
   * Sends a message to Rasa and returns the response
   * @param createMessageDto
   * @returns
   */
  create(createMessageDto: CreateMessageDto) {
    return this.messageProcessor.create(createMessageDto);
  }
}
