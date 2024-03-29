import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { map } from 'rxjs';
import { LoadSingleSlotDto } from 'src/messages/dto/load-single-slot.dto';
import { CreateRasaMessageDto } from './interfaces/createRasaMessage.dto';
import { RasaRequest } from './interfaces/rasa.interface';

@Injectable()
export class RasaService {
  constructor(private readonly http: HttpService) {}

  logger: Logger = new Logger('RasaService');

  /**
   * Does the actual HTTP Post against tracker endpoint to load a slot
   * @param sender
   * @param bot_name
   * @param slot : {slot_name: string, slot_value: string}
   * @returns
   */
  loadSlot(loadSingleSlotDto: LoadSingleSlotDto) {
    this.logger.verbose(
      `Loading slot ${loadSingleSlotDto.slot.slot_name} with value ${loadSingleSlotDto.slot.slot_value}`,
    );
    const { url } = this.extractBotData(loadSingleSlotDto.bot_name);
    const trackerEndpoint = `${url}/conversations/${loadSingleSlotDto.sender}/tracker/events?include_events=NONE`;
    this.logger.verbose(`Tracker endpoint: ${trackerEndpoint}`);
    const slotToLoad = {
      event: 'slot',
      name: loadSingleSlotDto.slot.slot_name,
      value: loadSingleSlotDto.slot.slot_value,
      timestamp: new Date().getTime(),
      metadata: {
        origin: 'bot_api.rasaService.loadSlot',
      },
    };

    return this.http
      .post(trackerEndpoint, slotToLoad)
      .pipe(map((response) => response.data));
  }

  sendMessage(createRasaMessageDto: CreateRasaMessageDto) {
    const { url, language } = this.extractBotData(createRasaMessageDto.botName);
    const endpoint = `${url}/webhooks/rest/webhook`;
    this.logger.verbose(
      `Posting message "${
        createRasaMessageDto.message
      }" to ${endpoint} with RasaRequest:  ${JSON.stringify(
        createRasaMessageDto,
      )}`,
    );
    return this.http
      .post(endpoint, createRasaMessageDto)
      .pipe(map((response) => response.data));
  }

  getMessageContext(payload: RasaRequest) {
    const { url, pilotID, language } = this.extractBotData(payload.botName);
    const endpoint = `${url}/conversations/${payload.sender}/tracker`;
    return this.http
      .get(endpoint)
      .pipe(map((response) => response.data))
      .pipe(
        map((tracker) => {
          return {
            slots: tracker.slots,
            intent: {
              name: tracker.latest_message.intent.name,
              confidence: tracker.latest_message.intent.confidence,
            },
            entities: tracker.latest_message.entities,
            rasa_message_id: tracker.latest_message.message_id,
            rasa_message_timestamp: tracker.latest_message.timestamp,
            action_name: tracker.latest_action_name,
          };
        }),
      );
  }

  getLatestResponse(sender: string, bot_name: string) {
    const { url, pilotID, language } = this.extractBotData(bot_name);
    const endpoint = `${url}/conversations/${sender}/tracker`;
    return (
      this.http
        .get(endpoint)
        .pipe(map((response) => response.data))
        // Filter the events array where the event is 'bot'
        .pipe(
          map((tracker) =>
            tracker.events.filter((event) => event.event === 'bot'),
          ),
        )
        // Get the last element of the filtered array
        .pipe(map((events) => events[events.length - 1]))
        // Get the text of the last element
        .pipe(map((event) => event.text))
    );
  }

  getHello(): string {
    return 'Hello World!';
  }

  extractBotData(botName: string): {
    url: string;
    pilotID: string;
    language: string;
  } {
    const botEnv = process.env.BOT_ENV || 'production';
    const protocol = process.env.BOT_PROTOCOL || 'http';
    // Split the string by a number regex, one or more digits are allowed
    const [stackName, pilotID, language] = botName
      ?.toLowerCase()
      .split(/(\d+)/);
    const serviceName = process.env.PRODUCTION_RASA_SERVICE_NAME || 'rasa';
    const servicePort = process.env.PRODUCTION_RASA_PORT || '5005';
    const devUrl: string = process.env.BOT_DEV_URL || 'http://localhost:5005';
    const productionUrl = `${protocol}://${stackName}_${serviceName}:${servicePort}`;
    this.logger.verbose(`BotHost: ${stackName} :  ${pilotID} : ${language}`);

    try {
      if (botEnv === 'development') {
        return { url: devUrl, pilotID, language };
      }
      return {
        url: productionUrl,
        pilotID,
        language,
      };
    } catch (error) {
      this.logger.error(error);
      return error;
    }
  }
}
