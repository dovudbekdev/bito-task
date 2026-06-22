import { UserRole } from '../enums';

const canViewCost = (role: UserRole): boolean =>
  role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;

type WithCostPrice = { costPrice: number };

type WithOrderItems<TItem extends WithCostPrice = WithCostPrice> = {
  items?: TItem[];
};

export const sanitizeProduct = <T extends WithCostPrice>(
  product: T,
  role: UserRole,
): Omit<T, 'costPrice'> | T => {
  if (canViewCost(role)) {
    return product;
  }

  const { costPrice: _costPrice, ...rest } = product;
  return rest as Omit<T, 'costPrice'>;
};

export const sanitizeOrderItem = <T extends WithCostPrice>(
  item: T,
  role: UserRole,
): Omit<T, 'costPrice'> | T => {
  if (canViewCost(role)) {
    return item;
  }

  const { costPrice: _costPrice, ...rest } = item;
  return rest as Omit<T, 'costPrice'>;
};

export const sanitizeOrder = <T extends WithOrderItems>(
  order: T,
  role: UserRole,
): T => {
  if (canViewCost(role) || !order.items) {
    return order;
  }

  return {
    ...order,
    items: order.items.map((item) => sanitizeOrderItem(item, role)),
  };
};

export const calculateOrderCost = (
  items: Array<{ costPrice: number; quantity: number }>,
): number =>
  items.reduce(
    (sum, item) => sum + Number(item.costPrice) * item.quantity,
    0,
  );
