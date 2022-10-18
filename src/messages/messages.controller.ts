import { Controller, Post, Body } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';

@Controller('v1')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post('message')
  create(@Body() createMessageDto: CreateMessageDto) {
    return this.messagesService.create(createMessageDto);
  }
}
