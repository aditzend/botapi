import { Transport } from '@nestjs/microservices';

export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  rabbitmq: {
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || 'amqp://192.168.43.169:30072/dev'],
      queue: process.env.RABBITMQ_QUEUE_NAME || 'messages',
      noAck: false,
      queueOptions: {
        durable: true,
      },
    },
  },
});
