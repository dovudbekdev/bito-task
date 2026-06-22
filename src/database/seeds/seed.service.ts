import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { UserRole } from '@common';
import { User } from '../../modules/user/entities/user.entity';
import { Tenant } from '../../modules/tenant/entities/tenant.entity';
import { Product } from '../../modules/products/entities/product.entity';
import {
  DEMO_ADMIN,
  DEMO_CASHIERS,
  DEMO_PRODUCTS,
  DEMO_TENANT_NAME,
  SEED_MARKER_LOGIN,
} from './fixtures/demo-data.fixture';

const BCRYPT_ROUNDS = 10;

export class SeedService {
  constructor(private readonly dataSource: DataSource) {}

  async run(): Promise<void> {
    const userRepo = this.dataSource.getRepository(User);
    const existing = await userRepo.findOne({ where: { login: SEED_MARKER_LOGIN } });

    if (existing) {
      console.log("Seed o'tkazib yuborildi: demo ma'lumotlar allaqachon mavjud.");
      return;
    }

    await this.dataSource.transaction(async (manager) => {
      const adminPassword = await bcrypt.hash(DEMO_ADMIN.password, BCRYPT_ROUNDS);
      const admin = manager.create(User, {
        name: DEMO_ADMIN.name,
        login: DEMO_ADMIN.login,
        password: adminPassword,
        role: UserRole.ADMIN,
        tenantId: null,
      });
      await manager.save(admin);

      const tenant = manager.create(Tenant, {
        name: DEMO_TENANT_NAME,
        userId: admin.id,
      });
      await manager.save(tenant);

      for (const cashierData of DEMO_CASHIERS) {
        const password = await bcrypt.hash(cashierData.password, BCRYPT_ROUNDS);
        const cashier = manager.create(User, {
          name: cashierData.name,
          login: cashierData.login,
          password,
          role: UserRole.CASHIER,
          tenantId: tenant.id,
        });
        await manager.save(cashier);
      }

      for (const productData of DEMO_PRODUCTS) {
        const product = manager.create(Product, {
          ...productData,
          tenant,
        });
        await manager.save(product);
      }
    });

    console.log(
      'Seed yakunlandi: admin, tenant, kassirlar va mahsulotlar yaratildi.',
    );
  }
}
