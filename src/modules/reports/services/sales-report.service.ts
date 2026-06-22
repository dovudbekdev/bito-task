import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  calculateOrderCost,
  IJwtPayload,
  OrderStatus,
  requireActiveTenant,
  UserRole,
} from '@common';
import { Repository } from 'typeorm';
import { Order } from '../../order/entities/order.entity';
import { QuerySalesReportDto } from '../dto';

@Injectable()
export class SalesReportService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  async getSalesReport(actor: IJwtPayload, query: QuerySalesReportDto) {
    const qb = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .where('order.status = :status', { status: OrderStatus.PAID });

    if (actor.role === UserRole.ADMIN) {
      const tenantId = requireActiveTenant(actor);
      qb.andWhere('order.tenant_id = :tenantId', { tenantId });
    }

    if (query.from) {
      qb.andWhere('order.paidAt >= :from', {
        from: new Date(`${query.from}T00:00:00.000Z`),
      });
    }

    if (query.to) {
      qb.andWhere('order.paidAt <= :to', {
        to: new Date(`${query.to}T23:59:59.999Z`),
      });
    }

    const orders = await qb.getMany();

    const orderCount = orders.length;
    const totalRevenue = orders.reduce(
      (sum, order) => sum + Number(order.totalAmount),
      0,
    );
    const totalCost = orders.reduce(
      (sum, order) => sum + calculateOrderCost(order.items ?? []),
      0,
    );
    const totalProfit = totalRevenue - totalCost;
    const averageOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;

    return {
      orderCount,
      totalRevenue,
      totalCost,
      totalProfit,
      averageOrderValue,
      period: {
        from: query.from ?? null,
        to: query.to ?? null,
      },
    };
  }
}
