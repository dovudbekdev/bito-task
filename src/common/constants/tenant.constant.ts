import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '../enums';
import { IJwtPayload } from '../interfaces';

export const assertUserOwnsTenant = (
  actor: IJwtPayload,
  tenant: { userId: number },
): void => {
  if (actor.role === UserRole.SUPER_ADMIN) {
    return;
  }

  if (actor.role !== UserRole.ADMIN || tenant.userId !== actor.userId) {
    throw new ForbiddenException('You are not allowed to access this tenant');
  }
};

export const assertSameTenantScope = (
  actor: IJwtPayload,
  targetUser: { role: UserRole; tenantId: number | null },
): void => {
  if (actor.role === UserRole.SUPER_ADMIN) {
    return;
  }

  if (actor.role === UserRole.ADMIN) {
    if (targetUser.role !== UserRole.CASHIER) {
      return;
    }

    if (!actor.tenantId || targetUser.tenantId !== actor.tenantId) {
      throw new ForbiddenException('You are not allowed to access this user');
    }
  }
};

export const requireActiveTenant = (actor: IJwtPayload): number => {
  if (!actor.tenantId) {
    throw new BadRequestException('Select an active tenant before performing this action');
  }

  return actor.tenantId;
};
