import { Module } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { HttpModule } from '@nestjs/axios';
import { RasaService } from 'src/rasa/rasa.service';
import { MessageProcessorService } from 'src/message-processor/message-processor';
import { RabbitmqService } from 'src/rabbitmq/rabbitmq.service';
import ParametersService from 'src/parameters/parameters.service';

@Module({
  imports: [HttpModule],
  controllers: [MessagesController],
  providers: [
    MessagesService,
    RasaService,
    MessageProcessorService,
    RabbitmqService,
    ParametersService,
  ],
})
export class MessagesModule {}
