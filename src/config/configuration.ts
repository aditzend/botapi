import { Transport } from '@nestjs/microservices';

export default () => ({
  port: parseInt(process.env.PORT, 10) || 4000,
  analytics: {
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || 'amqp://192.168.43.169:30072/dev'],
      queue: process.env.RABBITMQ_ANALYTICS_QUEUE_NAME || 'analytics',
      noAck: false,
      queueOptions: {
        durable: true,
      },
    },
  },
});
