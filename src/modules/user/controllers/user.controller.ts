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
import { CreateUserDto, QueryUsersDto, UpdateUserDto } from '../dto';
import { UserService } from '../services';

@ApiTags('User')
@ApiBearerAuth()
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  create(@CurrentUser() actor: IJwtPayload, @Body() dto: CreateUserDto) {
    return this.userService.create(actor, dto);
  }

  @Get()
  findAll(@CurrentUser() actor: IJwtPayload, @Query() query: QueryUsersDto) {
    return this.userService.findAll(actor, query);
  }

  @Get(':id')
  findOne(
    @CurrentUser() actor: IJwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.userService.findOne(actor, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() actor: IJwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ) {
    return this.userService.update(actor, id, dto);
  }

  @Delete(':id')
  remove(
    @CurrentUser() actor: IJwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.userService.remove(actor, id);
  }
}
