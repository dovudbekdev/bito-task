import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import {
  assertSameTenantScope,
  canCreateRole,
  canManageRole,
  canViewRole,
  IJwtPayload,
  requireActiveTenant,
  UserRole,
} from '@common';
import { CreateUserDto, QueryUsersDto, UpdateUserDto } from '../dto';
import { User } from '../entities/user.entity';

const BCRYPT_ROUNDS = 10;

export type SafeUser = Omit<User, 'password' | 'refreshToken'>;

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(actor: IJwtPayload, dto: CreateUserDto): Promise<SafeUser> {
    if (dto.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Super admin cannot be created');
    }

    if (dto.role === UserRole.CASHIER && actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admin can create cashiers');
    }

    if (!canCreateRole(actor.role, dto.role)) {
      throw new ForbiddenException('You are not allowed to create this role');
    }

    const existingUser = await this.userRepository.findOne({
      where: { login: dto.login },
    });

    if (existingUser) {
      throw new ConflictException('Login already exists');
    }

    const password = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    let tenantId: number | null = null;

    if (dto.role === UserRole.CASHIER) {
      tenantId = requireActiveTenant(actor);
    }

    const user = this.userRepository.create({
      name: dto.name,
      login: dto.login,
      password,
      role: dto.role,
      tenantId,
    });

    const savedUser = await this.userRepository.save(user);
    return this.toSafeUser(savedUser);
  }

  async findAll(actor: IJwtPayload, query: QueryUsersDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const qb = this.userRepository.createQueryBuilder('user');

    if (actor.role !== UserRole.SUPER_ADMIN) {
      qb.andWhere('user.role != :superAdminRole', {
        superAdminRole: UserRole.SUPER_ADMIN,
      });
    }

    if (actor.role === UserRole.ADMIN) {
      if (!actor.tenantId) {
        return {
          data: [],
          meta: { total: 0, page, limit, totalPages: 0 },
        };
      }

      qb.andWhere('user.tenantId = :tenantId', { tenantId: actor.tenantId });
      qb.andWhere('user.role = :cashierRole', { cashierRole: UserRole.CASHIER });
    }

    if (query.role) {
      qb.andWhere('user.role = :role', { role: query.role });
    }

    const [users, total] = await qb
      .orderBy('user.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: users.map((user) => this.toSafeUser(user)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(actor: IJwtPayload, id: number): Promise<SafeUser> {
    const user = await this.findByIdOrFail(id);
    this.assertCanView(actor, user);
    assertSameTenantScope(actor, user);
    return this.toSafeUser(user);
  }

  async update(actor: IJwtPayload, id: number, dto: UpdateUserDto): Promise<SafeUser> {
    const user = await this.findByIdOrFail(id);
    this.assertCanManage(actor, user);
    this.assertTenantAccess(actor, user);

    if (dto.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Cannot assign super admin role');
    }

    if (dto.role && !canCreateRole(actor.role, dto.role)) {
      throw new ForbiddenException('You are not allowed to assign this role');
    }

    if (dto.login && dto.login !== user.login) {
      const existingUser = await this.userRepository.findOne({
        where: { login: dto.login },
      });

      if (existingUser) {
        throw new ConflictException('Login already exists');
      }
    }

    if (dto.password) {
      user.password = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    }

    if (dto.name) {
      user.name = dto.name;
    }

    if (dto.login) {
      user.login = dto.login;
    }

    if (dto.role) {
      user.role = dto.role;
    }

    const updatedUser = await this.userRepository.save(user);
    return this.toSafeUser(updatedUser);
  }

  async remove(actor: IJwtPayload, id: number): Promise<void> {
    if (actor.userId === id) {
      throw new BadRequestException('You cannot delete your own account');
    }

    const user = await this.findByIdOrFail(id);

    if (user.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Super admin cannot be deleted');
    }

    this.assertCanManage(actor, user);
    this.assertTenantAccess(actor, user);
    await this.userRepository.remove(user);
  }

  async findByLogin(login: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .addSelect('user.refreshToken')
      .where('user.login = :login', { login })
      .getOne();
  }

  async findById(id: number): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async findByIdWithSecrets(id: number): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .addSelect('user.refreshToken')
      .where('user.id = :id', { id })
      .getOne();
  }

  async updateRefreshToken(userId: number, refreshToken: string | null): Promise<void> {
    await this.userRepository.update(userId, { refreshToken });
  }

  async updatePassword(userId: number, password: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await this.userRepository.update(userId, {
      password: hashedPassword,
      refreshToken: null,
    });
  }

  async countByRole(role: UserRole): Promise<number> {
    return this.userRepository.count({ where: { role } });
  }

  async createSeedUser(data: {
    name: string;
    login: string;
    password: string;
    role: UserRole;
  }): Promise<SafeUser> {
    const password = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

    const user = this.userRepository.create({
      name: data.name,
      login: data.login,
      password,
      role: data.role,
      tenantId: null,
    });

    const savedUser = await this.userRepository.save(user);
    return this.toSafeUser(savedUser);
  }

  assertCanManage(actor: IJwtPayload, target: User): void {
    if (!canManageRole(actor.role, target.role)) {
      throw new ForbiddenException('You are not allowed to manage this user');
    }
  }

  assertTenantAccess(actor: IJwtPayload, target: User): void {
    assertSameTenantScope(actor, target);
  }

  private assertCanView(actor: IJwtPayload, target: User): void {
    if (!canViewRole(actor.role, target.role)) {
      throw new ForbiddenException('You are not allowed to view this user');
    }
  }

  private async findByIdOrFail(id: number): Promise<User> {
    const user = await this.findById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private toSafeUser(user: User): SafeUser {
    const { password: _password, refreshToken: _refreshToken, ...safeUser } = user;
    return safeUser;
  }
}
