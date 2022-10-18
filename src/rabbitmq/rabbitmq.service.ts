import { Injectable, Logger } from '@nestjs/common';
import { SendJobDto } from './dto/send-job.dto';
import amqp from 'amqplib/callback_api';

@Injectable()
export class RabbitmqService {
  url = process.env.RABBITMQ_HOST || 'amqp://localhost:5672';
  logger: Logger = new Logger('RabbitmqService');

  sendJob(sendJobDto: SendJobDto) {
    const payload = JSON.stringify(sendJobDto);
    amqp.connect(this.url, function (error0, connection) {
      if (error0) {
        this.logger.error(error0, 'Error connecting to RabbitMQ');
      }
      connection.createChannel(function (error1, channel) {
        if (error1) {
          throw error1;
        }
        const { queueName } = sendJobDto;
        channel.assertQueue(queueName, {
          durable: true,
        });
        channel.sendToQueue(queueName, Buffer.from(payload), {
          persistent: true,
        });
        this.logger.log(`[x] Sent ${payload} to ${queueName}`);
      });
      setTimeout(function () {
        connection.close();
      }, 500);
    });
  }
}
