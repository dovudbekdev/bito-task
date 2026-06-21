import { Module } from '@nestjs/common';
import { ProductsController } from './controllers';
import { ProductsService } from './services';
import { Product } from './entities/product.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantModule } from '../tenant/tenant.module';

@Module({
  imports: [TypeOrmModule.forFeature([Product]), TenantModule],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
