import { Injectable, Logger } from '@nestjs/common';
import { MessageProcessorService } from 'src/message-processor/message-processor';
import { CreateMessageDto } from './dto/create-message.dto';

@Injectable()
export class MessagesService {
  constructor(private readonly messageProcessor: MessageProcessorService) {}

  logger: Logger = new Logger('MessagesService');
  create(createMessageDto: CreateMessageDto) {
    const rasaResponse = this.messageProcessor.create(createMessageDto);
    this.logger.debug(JSON.stringify(rasaResponse));
    return rasaResponse;
  }
}