import { Inject, Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { CreateMessageDto } from 'src/messages/dto/create-message.dto';
import { ResponseCreateMessageDto } from 'src/messages/dto/response-create-message.dto';
import ParametersService from 'src/parameters/parameters.service';
import { RasaRequest } from 'src/rasa/interfaces/rasa.interface';
import { RasaService } from 'src/rasa/rasa.service';
import { ClientProxy } from '@nestjs/microservices';
import parseParams from 'src/helpers/param-resolver';
import { JobMessageDto } from 'src/messages/dto/job-message.dto';

@Injectable()
export class MessageProcessorService {
  constructor(
    @Inject('ANALYTICS_SERVICE') private analyticsService: ClientProxy,
    private readonly rasa: RasaService,
    private readonly parameters: ParametersService,
  ) {}

  logger: Logger = new Logger('MessageProcessorService');

  sendJob(job: JobMessageDto) {
    this.analyticsService.emit(
      {
        group: job.parameters?.analytics_group || 'conversations',
        sent_by: 'bot-api',
        to_processor: job.parameters?.analytics_processor || 'T1',
      },
      job,
    );
    this.logger.debug(`Job sent to analytics queue`);
  }

  async create(createMessageDto: CreateMessageDto) {
    const params = parseParams(createMessageDto.parameters);
    const events: object[] = [];
    let context: any;
    let recursiveMessage: string = createMessageDto.message;
    let command = '';
    let cutCondition = false;
    let pushed_to_analytics_queue;
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
      const job: JobMessageDto = {
        recipient_id: createMessageDto.sender,
        bot_name: createMessageDto.bot_name,
        client_message: createMessageDto.message,
        bot_responses: events,
        context,
        channel: createMessageDto.channel,
        sent_at: new Date().toISOString(),
        parameters: params,
      };
      this.sendJob(job);
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
