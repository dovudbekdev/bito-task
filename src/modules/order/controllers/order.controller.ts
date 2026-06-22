import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, IJwtPayload, Roles, UserRole } from '@common';
import { CreateOrderDto, UpdateOrderDto } from '../dto';
import { OrderService } from '../services';

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @Roles(UserRole.CASHIER)
  async create(
    @Body() dto: CreateOrderDto,
    @CurrentUser() actor: IJwtPayload,
  ) {
    return this.orderService.create(actor, dto);
  }

  @Get()
  @Roles(UserRole.CASHIER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async findAll(@CurrentUser() actor: IJwtPayload) {
    return this.orderService.findAll(actor);
  }

  @Get(':id/receipt')
  @Roles(UserRole.CASHIER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getReceipt(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: IJwtPayload,
  ) {
    return this.orderService.getReceipt(actor, id);
  }

  @Get(':id')
  @Roles(UserRole.CASHIER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: IJwtPayload,
  ) {
    return this.orderService.findOne(actor, id);
  }

  @Patch(':id')
  @Roles(UserRole.CASHIER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderDto,
    @CurrentUser() actor: IJwtPayload,
  ) {
    return this.orderService.update(actor, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.CASHIER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: IJwtPayload,
  ) {
    return this.orderService.delete(actor, id);
  }
}
