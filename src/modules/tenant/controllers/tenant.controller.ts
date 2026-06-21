import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, IJwtPayload, Roles, UserRole } from '@common';
import { CreateTenantDto, QueryTenantsDto, UpdateTenantDto } from '../dto';
import { TenantService } from '../services';

@ApiTags('Tenant')
@ApiBearerAuth()
@Controller('tenant')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Roles(UserRole.ADMIN)
  @Post()
  create(@CurrentUser() actor: IJwtPayload, @Body() dto: CreateTenantDto) {
    return this.tenantService.create(actor, dto);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Get()
  findAll(@CurrentUser() actor: IJwtPayload, @Query() query: QueryTenantsDto) {
    return this.tenantService.findAll(actor, query);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Get(':id')
  findOne(
    @CurrentUser() actor: IJwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantService.findOne(actor, id);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Patch(':id')
  update(
    @CurrentUser() actor: IJwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTenantDto,
  ) {
    return this.tenantService.update(actor, id, dto);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Delete(':id')
  remove(
    @CurrentUser() actor: IJwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantService.remove(actor, id);
  }
}
