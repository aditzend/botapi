import { Module } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { HttpModule } from '@nestjs/axios';
import { RasaService } from 'src/rasa/rasa.service';
import { MessageProcessorService } from 'src/message-processor/message-processor.service';
import ParametersService from 'src/parameters/parameters.service';
import {
  ClientOptions,
  ClientProxyFactory,
  ClientsModule,
  Transport,
  RmqOptions,
} from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [HttpModule],
  controllers: [MessagesController],
  providers: [
    {
      provide: 'ANALYTICS_SERVICE',
      useFactory: (configService: ConfigService) => {
        const devServiceOptions: RmqOptions = configService.get('rabbitmq');
        return ClientProxyFactory.create(devServiceOptions);
      },
      inject: [ConfigService],
    },
    MessagesService,
    RasaService,
    MessageProcessorService,
    ParametersService,
  ],
})
export class MessagesModule {}
