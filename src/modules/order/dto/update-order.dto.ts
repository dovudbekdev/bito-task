import { OrderStatus } from '@common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { CreateOrderItemDto } from './create-order-item.dto';

export class UpdateOrderDto {
  @ApiPropertyOptional({ type: [CreateOrderItemDto], description: 'Replace order line items' })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items?: CreateOrderItemDto[];

  @ApiPropertyOptional({ enum: OrderStatus, example: OrderStatus.PAID })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;
}
