import { Body, Controller, Headers, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { Public } from '@common';
import { Request } from 'express';
import { PaymentWebhookDto } from '../dto';
import { PaymentWebhookService } from '../services';

type RawBodyRequest = Request & { rawBody?: Buffer };

@ApiTags('Webhooks')
@Controller('webhooks')
export class PaymentWebhookController {
  constructor(
    private readonly paymentWebhookService: PaymentWebhookService,
  ) {}

  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiHeader({
    name: 'x-signature',
    description: 'HMAC-SHA256 hex signature of the raw request body',
    required: true,
  })
  @Post('payment')
  handlePaymentWebhook(
    @Headers('x-signature') signature: string,
    @Body() dto: PaymentWebhookDto,
    @Req() req: RawBodyRequest,
  ) {
    return this.paymentWebhookService.handleWebhook(
      dto,
      signature,
      req.rawBody,
    );
  }
}
