import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ProductsService } from '../services';
import { CurrentUser, IJwtPayload, Roles, UserRole } from '@common';
import { CreateProductDto, QueryProductsDto, UpdateProductDto } from '../dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Products')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  async createProduct(
    @Body() dto: CreateProductDto,
    @CurrentUser() actor: IJwtPayload,
  ) {
    return this.productsService.createProduct(actor, dto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.CASHIER)
  async findAllProducts(
    @Query() query: QueryProductsDto,
    @CurrentUser() actor: IJwtPayload,
  ) {
    return this.productsService.findAllProducts(actor, query);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.CASHIER)
  async findProductById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: IJwtPayload,
  ) {
    return this.productsService.findProductByIdOrFail(id, actor);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async updateProduct(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
    @CurrentUser() actor: IJwtPayload,
  ) {
    return this.productsService.updateProduct(actor, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async deleteProduct(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: IJwtPayload,
  ) {
    return this.productsService.deleteProduct(actor, id);
  }
}
