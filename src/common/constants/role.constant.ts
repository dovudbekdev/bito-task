import { UserRole } from '../enums';

const ROLE_RANK: Record<UserRole, number> = {
  [UserRole.SUPER_ADMIN]: 3,
  [UserRole.ADMIN]: 2,
  [UserRole.CASHIER]: 1,
};

const CREATABLE_ROLES: Record<UserRole, UserRole[]> = {
  [UserRole.SUPER_ADMIN]: [UserRole.ADMIN, UserRole.CASHIER],
  [UserRole.ADMIN]: [UserRole.CASHIER],
  [UserRole.CASHIER]: [],
};

export const canCreateRole = (actorRole: UserRole, newRole: UserRole): boolean => {
  return CREATABLE_ROLES[actorRole].includes(newRole);
};

export const canManageRole = (actorRole: UserRole, targetRole: UserRole): boolean => {
  return ROLE_RANK[actorRole] > ROLE_RANK[targetRole];
};

export const canViewRole = (actorRole: UserRole, targetRole: UserRole): boolean => {
  if (actorRole === UserRole.SUPER_ADMIN) {
    return true;
  }

  return targetRole !== UserRole.SUPER_ADMIN;
};
