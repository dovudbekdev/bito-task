import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from '../entities/product.entity';
import { FindOptionsWhere, Not, Repository } from 'typeorm';
import { CreateProductDto, UpdateProductDto } from '../dto';
import { IJwtPayload, requireActiveTenant, UserRole } from '@common';
import { TenantService } from '../../tenant/services';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly tenantService: TenantService,
  ) {}

  async createProduct(actor: IJwtPayload, dto: CreateProductDto){
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

    return this.productRepository.save(product);
  }

  async findAllProducts(actor: IJwtPayload){
    const tenantId = requireActiveTenant(actor);
    await this.tenantService.findByIdOrFail(tenantId);
    return this.productRepository.find({ where: { tenant: { id: tenantId } } });
  }

  async findProductByIdOrFail(id: number, actor: IJwtPayload){
    if(actor.role === UserRole.SUPER_ADMIN){
      const product = await this.productRepository.findOne({ where: { id } });
      if(!product){
        throw new NotFoundException('Product not found');
      }
      return product;
    }
    const product = await this.productRepository.findOne({ where: { id, tenant: { id: requireActiveTenant(actor) } } });
    if(!product){
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async updateProduct(actor: IJwtPayload, id: number, dto: UpdateProductDto){
    const product = await this.findProductByIdOrFail(id, actor);

    if(dto.name){
      await this.validateUniqueProductName(product.tenant.id, dto.name, product.id);
    }

    Object.assign(product, dto);

    return this.productRepository.save(product);
  }

  async deleteProduct(actor: IJwtPayload, id: number){
    const product = await this.findProductByIdOrFail(id, actor);
    await this.productRepository.remove(product);
  }


  async validateUniqueProductName(tenantId: number, name: string, productId?: number){
    const where: FindOptionsWhere<Product> = {
      tenant: { id: tenantId },
      name,
    };
    if(productId){
      where.id = Not(productId);
    }
    const product = await this.productRepository.findOne({ where });

    if(product){
      throw new BadRequestException('Product name already exists');
    }
  }
}
