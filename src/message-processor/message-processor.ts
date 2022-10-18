import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { CreateMessageDto } from 'src/messages/dto/create-message.dto';
import { ResponseCreateMessageDto } from 'src/messages/dto/response-create-message.dto';
import ParametersService from 'src/parameters/parameters.service';
import { SendJobDto } from 'src/rabbitmq/dto/send-job.dto';
import { RabbitmqService } from 'src/rabbitmq/rabbitmq.service';
import { RasaRequest } from 'src/rasa/interfaces/rasa.interface';
import { RasaService } from 'src/rasa/rasa.service';

@Injectable()
export class MessageProcessorService {
  constructor(
    private readonly rasa: RasaService,
    private readonly rabbitmq: RabbitmqService,
    private readonly parameters: ParametersService,
  ) {}

  logger: Logger = new Logger('MessageProcessorService');

  async create(createMessageDto: CreateMessageDto) {
    const events: object[] = [];
    let context: any;
    let recursiveMessage: string = createMessageDto.message;
    let command = '';
    let cutCondition = false;
    let pushed_to_analytics_queue = false;
    let outgoing_params_uploaded = false;
    while (cutCondition === false) {
      this.logger.verbose({ events }, 'Events');
      const rasaRequest: RasaRequest = {
        sender: createMessageDto.sender,
        message: recursiveMessage,
        bot_name: createMessageDto.bot_name,
      };
      const rasaResponses = await firstValueFrom(
        this.rasa.sendMessage(rasaRequest),
      );
      if (recursiveMessage === createMessageDto.message) {
        context = await firstValueFrom(
          this.rasa.getMessageContext(rasaRequest),
        );
      }

      // Check that there actually are events present
      if (rasaResponses.length < 1) {
        cutCondition = true;
        this.logger.error({ rasaResponses }, 'Rasa responses is empty');
      }

      for (const event of rasaResponses) {
        if (event.text.includes('>>>')) {
          [command, recursiveMessage] = event.text.split('>>>');
          if (command === 'show_message_then_transfer') {
            events.push({
              message: recursiveMessage,
              event_name: '*text',
            });
            events.push({
              message: '',
              event_name: '*transfer',
            });
          }
          if (command === 'show_message_then_close') {
            events.push({
              message: recursiveMessage,
              event_name: '*text',
            });
            events.push({
              message: '',
              event_name: '*offline',
            });
          }
        } else {
          events.push({
            message: event.text,
            event_name: '*text',
          });
        }
      }

      const lastMessage = rasaResponses[rasaResponses.length - 1].text;
      const lastMessageHasEcho = lastMessage.includes('echo');
      if (!lastMessageHasEcho) {
        cutCondition = true;
      }
    }

    // Send job to ETL queue if analyze is true
    if (createMessageDto.analyze === true) {
      const job: SendJobDto = {
        queueName: `${createMessageDto.bot_name}_etl`,
        data: {
          interaction_id: createMessageDto.sender,
          bot_name: createMessageDto.bot_name,
          message: createMessageDto.message,
          events,
          context,
          channel: createMessageDto.channel,
          sentAt: new Date().toISOString(),
        },
      };
      this.rabbitmq.sendJob(job);
      pushed_to_analytics_queue = true;
    }

    if (createMessageDto.upload_outgoing_params === true) {
      this.parameters.uploadPrefixedSlots(context.slots);
      outgoing_params_uploaded = true;
    }

    const responseCreateMessageDto: ResponseCreateMessageDto = {
      recipient_id: createMessageDto.sender,
      bot_name: createMessageDto.bot_name,
      channel: createMessageDto.channel,
      events: events,
      context: createMessageDto.get_context
        ? context
        : { context_requested: false },
      status: {
        pushed_to_analytics_queue,
        outgoing_params_uploaded,
      },
    };
    return responseCreateMessageDto;
  }
}
