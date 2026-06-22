import { registerAs } from '@nestjs/config';

export const paymentConfig = registerAs('payment', () => ({
  webhookSecret: process.env.PAYMENT_WEBHOOK_SECRET,
}));

export type PaymentConfigType = ReturnType<typeof paymentConfig>;
