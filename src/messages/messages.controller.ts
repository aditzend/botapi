import { Controller, Post, Body, Logger } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { EventPattern } from '@nestjs/microservices';

@Controller('v1')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  logger: Logger = new Logger('MessagesController');
  @Post('message')
  create(@Body() createMessageDto: CreateMessageDto) {
    this.logger.verbose(
      `Received message from ${JSON.stringify(createMessageDto)}`,
    );
    if (createMessageDto.message === '*noresponse') {
      return this.messagesService.noResponse(createMessageDto);
    } else {
      return this.messagesService.create(createMessageDto);
    }
  }
}
