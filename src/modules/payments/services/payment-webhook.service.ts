import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import {
  isValidStatusTransition,
  OrderStatus,
  PaymentWebhookStatus,
} from '@common';
import { AllConfigType } from '@config';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { OrderService } from '../../order/services';
import { Order } from '../../order/entities/order.entity';
import { PaymentWebhookDto } from '../dto';
import { PaymentEvent } from '../entities/payment-event.entity';
import { verifyPaymentSignature } from '../utils/verify-payment-signature.util';

const EVENT_ALREADY_PROCESSED_MESSAGE = 'Event already processed';
const PAYMENT_PROCESSED_MESSAGE = 'Payment processed successfully';

@Injectable()
export class PaymentWebhookService {
  private readonly logger = new Logger(PaymentWebhookService.name);

  constructor(
    @InjectRepository(PaymentEvent)
    private readonly paymentEventRepository: Repository<PaymentEvent>,
    private readonly orderService: OrderService,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  async handleWebhook(
    dto: PaymentWebhookDto,
    signature: string | undefined,
    rawBody: Buffer | undefined,
  ): Promise<{ message: string }> {
    const paymentConfig = this.configService.get('payment', { infer: true })!;
    const secret = paymentConfig.webhookSecret;

    if (!secret || !verifyPaymentSignature(rawBody, signature, secret)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const existingEvent = await this.paymentEventRepository.findOne({
      where: { eventId: dto.eventId },
    });

    if (existingEvent) {
      this.logger.log(
        `Duplicate webhook event skipped: eventId=${dto.eventId}`,
      );
      return { message: EVENT_ALREADY_PROCESSED_MESSAGE };
    }

    const order = await this.orderService.findByIdForWebhook(dto.orderId);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    try {
      await this.processWebhookEvent(dto, order);
    } catch (error) {
      if (this.isDuplicateEventError(error)) {
        this.logger.log(
          `Duplicate webhook event skipped (race): eventId=${dto.eventId}`,
        );
        return { message: EVENT_ALREADY_PROCESSED_MESSAGE };
      }

      throw error;
    }

    this.logger.log(
      `Payment webhook processed: eventId=${dto.eventId}, orderId=${dto.orderId}, tenantId=${order.tenant.id}`,
    );

    return { message: PAYMENT_PROCESSED_MESSAGE };
  }

  private async processWebhookEvent(
    dto: PaymentWebhookDto,
    order: Order,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const orderRepo = manager.getRepository(Order);
      const paymentEventRepo = manager.getRepository(PaymentEvent);

      const lockedOrder = await this.orderService.findByIdForWebhook(
        dto.orderId,
        manager,
      );

      if (!lockedOrder) {
        throw new NotFoundException('Order not found');
      }

      const processedAt = new Date();
      const paymentEvent = paymentEventRepo.create({
        eventId: dto.eventId,
        orderId: lockedOrder.id,
        tenantId: lockedOrder.tenant.id,
        provider: null,
        payload: { ...dto },
        processedAt,
      });

      await paymentEventRepo.save(paymentEvent);

      if (
        dto.status === PaymentWebhookStatus.PAID &&
        isValidStatusTransition(lockedOrder.status, OrderStatus.PAID)
      ) {
        lockedOrder.status = OrderStatus.PAID;
        lockedOrder.paidAt = processedAt;
        await orderRepo.save(lockedOrder);
      }
    });
  }

  private isDuplicateEventError(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) {
      return false;
    }

    const driverError = error.driverError as { code?: string };
    return driverError.code === '23505';
  }
}
