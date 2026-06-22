import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { User } from '../modules/user/entities/user.entity';
import { Tenant } from '../modules/tenant/entities/tenant.entity';
import { Product } from '../modules/products/entities/product.entity';
import { Order } from '../modules/order/entities/order.entity';
import { OrderItem } from '../modules/order/entities/order-item.entity';
import { PaymentEvent } from '../modules/payments/entities/payment-event.entity';

config({ path: '.env' });
config({ path: '.env.development.local', override: true });

const dbUrl = process.env.DB_URL;
if (!dbUrl) {
  throw new Error('DB_URL is missing. Set it in .env or .env.development.local');
}

const dbSsl = process.env.DB_SSL === 'true';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: dbUrl,
  ssl: dbSsl ? { rejectUnauthorized: false } : false,
  entities: [User, Tenant, Product, Order, OrderItem, PaymentEvent],
  synchronize: false,
  logging: false,
});
