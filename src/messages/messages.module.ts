import { Module } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { HttpModule } from '@nestjs/axios';
import { RasaService } from 'src/rasa/rasa.service';
import { MessageProcessorService } from 'src/message-processor/message-processor.service';
import ParametersService from 'src/parameters/parameters.service';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    HttpModule,
    ClientsModule.register([
      {
        name: 'ANALYTICS_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL || 'amqp://192.168.43.169:30072/dev'],
          queue: process.env.ANALYTICS_QUEUE || 'analytics',
          noAck: false,
          queueOptions: {
            durable: true,
          },
        },
      },
    ]),
  ],
  controllers: [MessagesController],
  providers: [
    MessagesService,
    RasaService,
    MessageProcessorService,
    ParametersService,
  ],
})
export class MessagesModule {}
