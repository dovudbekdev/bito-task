import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { UserRole } from '@common';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional({
    enum: UserRole,
    example: UserRole.CASHIER,
    description: 'Foydalanuvchi roli',
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
