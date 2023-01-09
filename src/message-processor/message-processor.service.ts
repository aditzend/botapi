import { Inject, Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { CreateMessageDto } from 'src/messages/dto/create-message.dto';
import { ResponseCreateMessageDto } from 'src/messages/dto/response-create-message.dto';
import ParametersService from 'src/parameters/parameters.service';
import { RasaRequest } from 'src/rasa/interfaces/rasa.interface';
import { RasaService } from 'src/rasa/rasa.service';
import { ClientProxy } from '@nestjs/microservices';
// import parseParams from 'src/helpers/param-resolver';
import { JobMessageDto } from 'src/messages/dto/job-message.dto';
import { Slot } from 'src/messages/entities/slot.entity';
import { LoadSlotsDto } from 'src/messages/dto/load-slots.dto';
import { NoResponseMessageDto } from 'src/messages/dto/no-response-message.dto';

@Injectable()
export class MessageProcessorService {
  constructor(
    @Inject('ANALYTICS_SERVICE') private analyticsService: ClientProxy,
    private readonly rasaService: RasaService,
    private readonly parametersService: ParametersService,
  ) {}

  logger: Logger = new Logger('MessageProcessorService');

  /**
   * Loads slots from 'load_slots' in the conversation tracker
   * @param {string} sender
   * @param {string} bot_name
   * @param {Slot[]} slots
   */
  async loadSlots(loadSlotsDto: LoadSlotsDto) {
    for (const slot of loadSlotsDto.load_slots) {
      this.logger.verbose(
        `Loading slot ${slot.slot_name} with value ${slot.slot_value}`,
      );

      // this.rasaService.loadSlot({
      //   sender: loadSlotsDto.sender,
      //   bot_name: loadSlotsDto.bot_name,
      //   slot,
      // });
      const loadSlotResponse = await firstValueFrom(
        this.rasaService.loadSlot({
          sender: loadSlotsDto.sender,
          bot_name: loadSlotsDto.bot_name,
          slot,
        }),
      );
      this.logger.error(JSON.stringify(loadSlotResponse));
      this.logger.debug(
        `Slot "${slot.slot_name}" loaded to ${
          loadSlotsDto.sender
        } with value: "${loadSlotResponse.slots[slot.slot_name]}" `,
      );
    }
  }

  /**
   * Sends an analytics job to Rabbit MQ
   * @param job: JobMessageDto
   */

  sendJob(job: JobMessageDto) {
    this.analyticsService.emit(
      {
        group: job.analytics?.group || 'conversations',
        sent_by: 'bot-api',
        to_processor: job.analytics?.processor || 'T1',
      },
      job,
    );
    this.logger.debug(`Job sent to analytics queue`);
  }

  /**
   * Returns a response to the user indicating that there is no audio
   * @param {createMessageDto} CreateMessageDto
   * @returns {ResponseCreateMessageDto} Result of noresponse
   */
  async noResponse(createMessageDto: CreateMessageDto) {
    this.logger.warn(`No response to ${createMessageDto.sender}`);
    // const latestResponse = await this.rasaService.getLatestResponse(
    //   createMessageDto.sender,
    //   createMessageDto.bot_name,
    // );
    const events: object[] = [
      {
        message:
          'Perdón, no puedo oír bien. ¿Puede repetirlo una vez más si es tan amable por favor?',
        event_name: '*text',
      },
    ];

    const { language } = this.rasaService.extractBotData(
      createMessageDto.bot_name,
    );
    const contextRequest: RasaRequest = {
      sender: createMessageDto.sender,
      message: '',
      botName: createMessageDto.bot_name,
      customData: { language },
    };

    const context = await firstValueFrom(
      this.rasaService.getMessageContext(contextRequest),
    );

    const job: JobMessageDto = {
      recipient_id: createMessageDto.sender,
      bot_name: createMessageDto.bot_name,
      client_message: createMessageDto.message,
      bot_responses: events,
      context,
      channel: createMessageDto.channel,
      sent_at: new Date(),
    };
    this.sendJob(job);

    const responseCreateMessageDto: ResponseCreateMessageDto = {
      recipient_id: createMessageDto.sender,
      bot_name: createMessageDto.bot_name,
      channel: createMessageDto.channel,
      events: events,
      context,
      status: {
        pushed_to_analytics_queue: false,
        outgoing_params_uploaded: false,
        initial_slots_loaded: false,
      },
    };
    return responseCreateMessageDto;
  }

  /**
   * Posts a message recursively to Rasa and returns the response
   * @param {createMessageDto} CreateMessageDto
   * @returns {ResponseCreateMessageDto} Result of posting to Rasa
   */
  async create(createMessageDto: CreateMessageDto) {
    const events: object[] = [];
    let context: any;
    let recursiveMessage: string = createMessageDto.message;
    let command = '';
    let cutCondition = false;
    let pushed_to_analytics_queue;
    let outgoing_params_uploaded = false;
    let initial_slots_loaded = false;
    const { language } = this.rasaService.extractBotData(
      createMessageDto.bot_name,
    );

    // Load slots
    if (createMessageDto.load_slots) {
      await this.loadSlots({
        sender: createMessageDto.sender,
        bot_name: createMessageDto.bot_name,
        load_slots: createMessageDto.load_slots,
      });
      initial_slots_loaded = true;
    }

    // MESSAGE RECURSION
    while (cutCondition === false) {
      const rasaRequest: RasaRequest = {
        sender: createMessageDto.sender,
        message: recursiveMessage,
        botName: createMessageDto.bot_name,
        customData: { language },
      };
      const rasaResponses = await firstValueFrom(
        this.rasaService.sendMessage(rasaRequest),
      );
      // if (recursiveMessage === createMessageDto.message) {
      context = await firstValueFrom(
        this.rasaService.getMessageContext(rasaRequest),
      );
      // }

      // Check that there actually are events present
      if (rasaResponses.length < 1) {
        cutCondition = true;
        this.logger.error({ rasaResponses }, 'Rasa responses is empty');
      } else {
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

        const lastMessage =
          rasaResponses[rasaResponses.length - 1] &&
          rasaResponses[rasaResponses.length - 1].text;
        const lastMessageHasEcho = lastMessage.includes('echo');
        if (!lastMessageHasEcho) {
          cutCondition = true;
        }
      }
    }
    // END MESSAGE RECURSION

    // Send job to ETL queue if analyze is true
    if (createMessageDto.analyze === true) {
      const job: JobMessageDto = {
        recipient_id: createMessageDto.sender,
        bot_name: createMessageDto.bot_name,
        client_message: createMessageDto.message,
        bot_responses: events,
        context,
        channel: createMessageDto.channel,
        sent_at: new Date(),
      };
      this.sendJob(job);
    }

    if (createMessageDto.upload_outgoing_params === true) {
      this.parametersService.uploadPrefixedSlots(context.slots);
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
        initial_slots_loaded,
      },
    };
    return responseCreateMessageDto;
  }
}
