import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  assertAtLeastOneUpdateField,
  assertCanModifyOrder,
  IJwtPayload,
  isFinalOrderStatus,
  isValidStatusTransition,
  OrderStatus,
  requireActiveTenant,
  UserRole,
} from '@common';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { Product } from '../../products/entities/product.entity';
import { TenantService } from '../../tenant/services';
import { CreateOrderDto, CreateOrderItemDto, UpdateOrderDto } from '../dto';
import { OrderItem } from '../entities/order-item.entity';
import { Order } from '../entities/order.entity';

type OrderItemInput = { productId: number; quantity: number };

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly dataSource: DataSource,
    private readonly tenantService: TenantService,
  ) {}

  async create(actor: IJwtPayload, dto: CreateOrderDto) {
    if (actor.role !== UserRole.CASHIER) {
      throw new ForbiddenException('Only cashier can create orders');
    }

    const tenantId = requireActiveTenant(actor);
    await this.tenantService.findByIdOrFail(tenantId);

    const mergedItems = this.mergeDuplicateItems(dto.items);

    return this.dataSource.transaction(async (manager) => {
      const productsMap = await this.loadAndValidateProducts(
        tenantId,
        mergedItems,
        manager,
      );

      const orderRepo = manager.getRepository(Order);
      const order = orderRepo.create({
        status: OrderStatus.PENDING_PAYMENT,
        tenant: { id: tenantId },
        cashier: { id: actor.userId },
        totalAmount: 0,
        totalQuantity: 0,
      });

      const itemEntities = this.buildOrderItems(order, productsMap, mergedItems);
      this.recalculateTotals(order, itemEntities);

      const savedOrder = await orderRepo.save(order);
      const orderItemRepo = manager.getRepository(OrderItem);

      await orderItemRepo.save(
        itemEntities.map((item) => orderItemRepo.create(item)),
      );
      await this.decrementStock(productsMap, mergedItems, manager);

      return this.findOrderByIdOrFail(savedOrder.id, actor, manager);
    });
  }

  async findAll(actor: IJwtPayload) {
    const qb = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('order.tenant', 'tenant')
      .leftJoinAndSelect('order.cashier', 'cashier');

    if (actor.role === UserRole.CASHIER) {
      qb.andWhere('order.cashier_id = :userId', { userId: actor.userId });
    } else if (actor.role === UserRole.ADMIN) {
      const tenantId = requireActiveTenant(actor);
      qb.andWhere('order.tenant_id = :tenantId', { tenantId });
    }

    return qb.orderBy('order.createdAt', 'DESC').getMany();
  }

  async findOne(actor: IJwtPayload, id: number) {
    return this.findOrderByIdOrFail(id, actor);
  }

  async update(actor: IJwtPayload, id: number, dto: UpdateOrderDto) {
    const hasItemsUpdate = dto.items !== undefined;
    const hasStatusUpdate = dto.status !== undefined;
    assertAtLeastOneUpdateField(hasItemsUpdate, hasStatusUpdate);

    return this.dataSource.transaction(async (manager) => {
      const order = await this.findOrderByIdOrFail(id, actor, manager);
      assertCanModifyOrder(actor, order);

      if (hasItemsUpdate && isFinalOrderStatus(order.status)) {
        throw new BadRequestException('Cannot modify a paid or cancelled order');
      }

      if (hasStatusUpdate && isFinalOrderStatus(order.status)) {
        throw new BadRequestException('Cannot modify a paid or cancelled order');
      }

      if (
        hasStatusUpdate &&
        !isValidStatusTransition(order.status, dto.status!)
      ) {
        throw new BadRequestException('Invalid status transition');
      }

      const orderRepo = manager.getRepository(Order);
      const orderItemRepo = manager.getRepository(OrderItem);
      const willCancel = dto.status === OrderStatus.CANCELLED;

      if (hasItemsUpdate) {
        await this.restoreStockFromItems(order.items, manager);

        const mergedItems = this.mergeDuplicateItems(dto.items!);
        const productsMap = await this.loadAndValidateProducts(
          order.tenant.id,
          mergedItems,
          manager,
        );

        await orderItemRepo.delete({ order: { id: order.id } });

        const itemEntities = this.buildOrderItems(
          order,
          productsMap,
          mergedItems,
        );
        this.recalculateTotals(order, itemEntities);

        await orderItemRepo.save(
          itemEntities.map((item) => orderItemRepo.create(item)),
        );

        if (!willCancel) {
          await this.decrementStock(productsMap, mergedItems, manager);
        }
      }

      if (dto.status === OrderStatus.CANCELLED) {
        if (!hasItemsUpdate) {
          await this.restoreStockFromItems(order.items, manager);
        }

        order.status = OrderStatus.CANCELLED;
      } else if (dto.status === OrderStatus.PAID) {
        order.status = OrderStatus.PAID;
        order.paidAt = new Date();
      }

      await orderRepo.save(order);

      return this.findOrderByIdOrFail(id, actor, manager);
    });
  }

  async delete(actor: IJwtPayload, id: number) {
    await this.dataSource.transaction(async (manager) => {
      const order = await this.findOrderByIdOrFail(id, actor, manager);
      assertCanModifyOrder(actor, order);

      if (order.status !== OrderStatus.PENDING_PAYMENT) {
        throw new BadRequestException(
          'Only pending payment orders can be deleted',
        );
      }

      await this.restoreStockFromItems(order.items, manager);
      await manager.getRepository(Order).remove(order);
    });
  }

  private async findOrderByIdOrFail(
    id: number,
    actor: IJwtPayload,
    manager?: EntityManager,
  ): Promise<Order> {
    const orderRepo = manager
      ? manager.getRepository(Order)
      : this.orderRepository;

    const order = await orderRepo.findOne({
      where: { id },
      relations: {
        items: { product: true },
        tenant: true,
        cashier: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (actor.role === UserRole.CASHIER && order.cashier.id !== actor.userId) {
      throw new NotFoundException('Order not found');
    }

    if (actor.role === UserRole.ADMIN) {
      const tenantId = requireActiveTenant(actor);
      if (order.tenant.id !== tenantId) {
        throw new NotFoundException('Order not found');
      }
    }

    return order;
  }

  private mergeDuplicateItems(items: CreateOrderItemDto[]): OrderItemInput[] {
    const map = new Map<number, number>();

    for (const item of items) {
      map.set(item.productId, (map.get(item.productId) ?? 0) + item.quantity);
    }

    return Array.from(map.entries()).map(([productId, quantity]) => ({
      productId,
      quantity,
    }));
  }

  private async loadAndValidateProducts(
    tenantId: number,
    items: OrderItemInput[],
    manager: EntityManager,
  ): Promise<Map<number, Product>> {
    const productIds = items.map((item) => item.productId);
    const products = await manager.getRepository(Product).find({
      where: { id: In(productIds), tenant: { id: tenantId } },
    });

    const productsMap = new Map(products.map((product) => [product.id, product]));

    for (const item of items) {
      const product = productsMap.get(item.productId);

      if (!product) {
        throw new NotFoundException(
          `Product with id ${item.productId} not found`,
        );
      }

      if (product.quantity < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for product: ${product.name}`,
        );
      }
    }

    return productsMap;
  }

  private buildOrderItems(
    order: Order,
    productsMap: Map<number, Product>,
    items: OrderItemInput[],
  ): Partial<OrderItem>[] {
    return items.map((item) => {
      const product = productsMap.get(item.productId)!;
      const unitPrice = Number(product.unitPrice);
      const costPrice = Number(product.costPrice);

      return {
        order,
        product,
        productName: product.name,
        quantity: item.quantity,
        unitPrice,
        costPrice,
        lineTotal: unitPrice * item.quantity,
      };
    });
  }

  private recalculateTotals(order: Order, items: Partial<OrderItem>[]): void {
    order.totalQuantity = items.reduce(
      (sum, item) => sum + (item.quantity ?? 0),
      0,
    );
    order.totalAmount = items.reduce(
      (sum, item) => sum + Number(item.lineTotal ?? 0),
      0,
    );
  }

  private async decrementStock(
    productsMap: Map<number, Product>,
    items: OrderItemInput[],
    manager: EntityManager,
  ): Promise<void> {
    const productRepo = manager.getRepository(Product);

    for (const item of items) {
      const product = productsMap.get(item.productId)!;
      product.quantity -= item.quantity;
      await productRepo.save(product);
    }
  }

  private async restoreStockFromItems(
    items: OrderItem[],
    manager: EntityManager,
  ): Promise<void> {
    const productRepo = manager.getRepository(Product);

    for (const item of items) {
      const productId = item.product?.id;

      if (!productId) {
        continue;
      }

      const product = await productRepo.findOne({ where: { id: productId } });

      if (product) {
        product.quantity += item.quantity;
        await productRepo.save(product);
      }
    }
  }
}
