import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { map } from 'rxjs';
import getBotHost from 'src/helpers/get-bot-host';
import { Slot } from 'src/messages/entities/slot.entity';
import { RasaRequest } from './interfaces/rasa.interface';

@Injectable()
export class RasaService {
  constructor(private readonly http: HttpService) {}

  logger: Logger = new Logger('RasaService');

  loadSlot(sender: string, bot_name: string, slot: Slot) {
    this.logger.verbose(
      `Loading slot ${slot.slot_name} with value ${slot.slot_value}`,
    );
    const url = getBotHost(bot_name);
    const trackerEndpoint = `${url}/conversations/${sender}/tracker/events?include_events=NONE`;
    this.logger.debug('Endpoint', trackerEndpoint);
    return this.http
      .post(trackerEndpoint, slot)
      .pipe(map((response) => response.data));
  }

  sendMessage(payload: RasaRequest) {
    const url = getBotHost(payload.bot_name);
    const endpoint = `${url}/webhooks/rest/webhook`;
    this.logger.verbose(
      `Posting to ${endpoint} with payload ${JSON.stringify(payload)}`,
    );
    return this.http
      .post(endpoint, payload)
      .pipe(map((response) => response.data));
  }

  getMessageContext(payload: RasaRequest) {
    const url = getBotHost(payload.bot_name);
    const endpoint = `${url}/conversations/${payload.sender}/tracker`;
    this.logger.debug('Endpoint', endpoint);
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

  getHello(): string {
    return 'Hello World!';
  }
}
