import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class CreateOrderItemDto {
  @ApiProperty({ example: 1, description: 'Product ID' })
  @IsInt()
  @Min(1)
  productId: number;

  @ApiProperty({ example: 2, description: 'Quantity to order' })
  @IsInt()
  @Min(1)
  quantity: number;
}
