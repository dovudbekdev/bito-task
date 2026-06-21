import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../products/entities/product.entity';
import { TenantModule } from '../tenant/tenant.module';
import { OrderController } from './controllers';
import { OrderItem } from './entities/order-item.entity';
import { Order } from './entities/order.entity';
import { OrderService } from './services';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Product]),
    TenantModule,
  ],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
