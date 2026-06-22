import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../order/entities/order.entity';
import { SalesReportController } from './controllers';
import { SalesReportService } from './services';

@Module({
  imports: [TypeOrmModule.forFeature([Order])],
  controllers: [SalesReportController],
  providers: [SalesReportService],
})
export class ReportsModule {}
