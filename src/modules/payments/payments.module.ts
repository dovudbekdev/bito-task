import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderModule } from '../order/order.module';
import { PaymentWebhookController } from './controllers';
import { PaymentEvent } from './entities/payment-event.entity';
import { PaymentWebhookService } from './services';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentEvent]), OrderModule],
  controllers: [PaymentWebhookController],
  providers: [PaymentWebhookService],
})
export class PaymentsModule {}
