import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IJwtPayload, requireActiveTenant, sanitizeProduct, UserRole } from '@common';
import { Brackets, Repository } from 'typeorm';
import { TenantService } from '../../tenant/services';
import { CreateProductDto, QueryProductsDto, UpdateProductDto } from '../dto';
import { Product } from '../entities/product.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly tenantService: TenantService,
  ) {}

  async createProduct(actor: IJwtPayload, dto: CreateProductDto) {
    const tenantId = requireActiveTenant(actor);
    const tenant = await this.tenantService.findByIdOrFail(tenantId);

    await this.validateUniqueProductName(tenantId, dto.name);

    const product = this.productRepository.create({
      tenant,
      name: dto.name,
      description: dto.description,
      quantity: dto.quantity,
      costPrice: dto.costPrice,
      unitPrice: dto.unitPrice,
    });

    const saved = await this.productRepository.save(product);
    return sanitizeProduct(saved, actor.role);
  }

  async findAllProducts(actor: IJwtPayload, query: QueryProductsDto) {
    const tenantId = requireActiveTenant(actor);
    await this.tenantService.findByIdOrFail(tenantId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const qb = this.productRepository
      .createQueryBuilder('product')
      .where('product.tenant_id = :tenantId', { tenantId });

    if (query.search?.trim()) {
      const term = `%${query.search.trim()}%`;
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where('product.name ILIKE :term', { term })
            .orWhere('product.description ILIKE :term', { term });
        }),
      );
    }

    const [products, total] = await qb
      .orderBy('product.name', 'ASC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: products.map((product) => sanitizeProduct(product, actor.role)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findProductByIdOrFail(id: number, actor: IJwtPayload) {
    const product = await this.findProductEntityByIdOrFail(id, actor);
    return sanitizeProduct(product, actor.role);
  }

  async updateProduct(actor: IJwtPayload, id: number, dto: UpdateProductDto) {
    const product = await this.findProductEntityByIdOrFail(id, actor);

    if (dto.name) {
      const tenantId =
        actor.role === UserRole.SUPER_ADMIN
          ? product.tenant?.id
          : requireActiveTenant(actor);

      if (!tenantId) {
        throw new NotFoundException('Product not found');
      }

      await this.validateUniqueProductName(tenantId, dto.name, product.id);
    }

    Object.assign(product, dto);

    const saved = await this.productRepository.save(product);
    return sanitizeProduct(saved, actor.role);
  }

  async deleteProduct(actor: IJwtPayload, id: number) {
    const product = await this.findProductEntityByIdOrFail(id, actor);
    await this.productRepository.remove(product);
  }

  private async findProductEntityByIdOrFail(
    id: number,
    actor: IJwtPayload,
  ): Promise<Product> {
    if (actor.role === UserRole.SUPER_ADMIN) {
      const product = await this.productRepository.findOne({
        where: { id },
        relations: { tenant: true },
      });
      if (!product) {
        throw new NotFoundException('Product not found');
      }
      return product;
    }

    const product = await this.productRepository.findOne({
      where: { id, tenant: { id: requireActiveTenant(actor) } },
      relations: { tenant: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async validateUniqueProductName(
    tenantId: number,
    name: string,
    productId?: number,
  ) {
    const qb = this.productRepository
      .createQueryBuilder('product')
      .where('product.tenant_id = :tenantId', { tenantId })
      .andWhere('product.name = :name', { name });

    if (productId) {
      qb.andWhere('product.id != :productId', { productId });
    }

    const existing = await qb.getOne();

    if (existing) {
      throw new BadRequestException('Product name already exists');
    }
  }
}
