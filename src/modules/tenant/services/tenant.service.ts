import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  assertUserOwnsTenant,
  IJwtPayload,
  UserRole,
} from '@common';
import { User } from '../../user/entities/user.entity';
import { CreateTenantDto, QueryTenantsDto, UpdateTenantDto } from '../dto';
import { Tenant } from '../entities/tenant.entity';

@Injectable()
export class TenantService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(actor: IJwtPayload, dto: CreateTenantDto) {
    if (actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admin can create tenants');
    }

    const tenant = this.tenantRepository.create({
      name: dto.name,
      userId: actor.userId,
    });

    const savedTenant = await this.tenantRepository.save(tenant);
    return savedTenant;
  }

  async findAll(actor: IJwtPayload, query: QueryTenantsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const qb = this.tenantRepository.createQueryBuilder('tenant');

    if (actor.role === UserRole.ADMIN) {
      qb.andWhere('tenant.userId = :userId', { userId: actor.userId });
    }

    const [tenants, total] = await qb
      .orderBy('tenant.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: tenants,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(actor: IJwtPayload, id: number) {
    const tenant = await this.findByIdOrFail(id);
    assertUserOwnsTenant(actor, tenant);
    return tenant;
  }

  async update(actor: IJwtPayload, id: number, dto: UpdateTenantDto) {
    const tenant = await this.findByIdOrFail(id);
    assertUserOwnsTenant(actor, tenant);

    if (dto.name) {
      tenant.name = dto.name;
    }

    return this.tenantRepository.save(tenant);
  }

  async remove(actor: IJwtPayload, id: number): Promise<void> {
    const tenant = await this.findByIdOrFail(id);
    assertUserOwnsTenant(actor, tenant);

    const cashierCount = await this.userRepository.count({
      where: { tenantId: id, role: UserRole.CASHIER },
    });

    if (cashierCount > 0) {
      throw new ConflictException('Cannot delete tenant with active cashiers');
    }

    await this.tenantRepository.remove(tenant);
  }

  async findByUserId(userId: number): Promise<Tenant[]> {
    return this.tenantRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findByIdOrFail(id: number): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({ where: { id } });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }
}
