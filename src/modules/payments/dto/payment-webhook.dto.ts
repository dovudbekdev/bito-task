import { ApiProperty } from '@nestjs/swagger';
import { PaymentWebhookStatus } from '@common';
import { IsEnum, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class PaymentWebhookDto {
  @ApiProperty({ example: 'evt_123', description: 'Unique payment provider event ID' })
  @IsString()
  @IsNotEmpty()
  eventId: string;

  @ApiProperty({ example: 1, description: 'Order ID' })
  @IsInt()
  @Min(1)
  orderId: number;

  @ApiProperty({ enum: PaymentWebhookStatus, example: PaymentWebhookStatus.PAID })
  @IsEnum(PaymentWebhookStatus)
  status: PaymentWebhookStatus;
}
