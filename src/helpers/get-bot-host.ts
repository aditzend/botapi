import { Logger } from '@nestjs/common';

const logger: Logger = new Logger('BotHost');

export default function getBotHost(botName: string): string {
  const botEnv = process.env.BOT_ENV || 'production';
  const protocol = process.env.BOT_PROTOCOL || 'http';
  const stackName = botName?.toLowerCase();
  const serviceName = process.env.PRODUCTION_RASA_SERVICE_NAME || 'rasa';
  const servicePort = process.env.PRODUCTION_RASA_PORT || '5005';
  const devUrl: string = process.env.BOT_DEV_URL || 'http://localhost:5005';
  const productionUrl = `${protocol}://${stackName}_${serviceName}:${servicePort}`;

  try {
    if (botEnv === 'development') {
      return devUrl;
    }
    return productionUrl;
  } catch (error) {
    logger.log(error);
    return error;
  }
}
