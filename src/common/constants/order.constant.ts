import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { OrderStatus, UserRole } from '../enums';
import { IJwtPayload } from '../interfaces';
import { requireActiveTenant } from './tenant.constant';

export interface OrderScope {
  cashier: { id: number };
  tenant: { id: number };
}

export const assertCanModifyOrder = (
  actor: IJwtPayload,
  order: OrderScope,
): void => {
  if (actor.role === UserRole.SUPER_ADMIN) {
    return;
  }

  if (actor.role === UserRole.CASHIER) {
    if (order.cashier.id !== actor.userId) {
      throw new ForbiddenException('You are not allowed to modify this order');
    }
    return;
  }

  if (actor.role === UserRole.ADMIN) {
    const tenantId = requireActiveTenant(actor);
    if (order.tenant.id !== tenantId) {
      throw new ForbiddenException('You are not allowed to modify this order');
    }
    return;
  }

  throw new ForbiddenException('You are not allowed to modify this order');
};

export const isValidStatusTransition = (
  current: OrderStatus,
  next: OrderStatus,
): boolean => {
  if (current === OrderStatus.PENDING_PAYMENT) {
    return next === OrderStatus.PAID || next === OrderStatus.CANCELLED;
  }

  return false;
};

export const isFinalOrderStatus = (status: OrderStatus): boolean => {
  return status === OrderStatus.PAID || status === OrderStatus.CANCELLED;
};

export const assertAtLeastOneUpdateField = (
  hasItems: boolean,
  hasStatus: boolean,
): void => {
  if (!hasItems && !hasStatus) {
    throw new BadRequestException('At least one field must be provided');
  }
};
