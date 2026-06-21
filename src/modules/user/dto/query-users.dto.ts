import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { UserRole } from '@common';

export class QueryUsersDto {
  @ApiPropertyOptional({ example: 1, minimum: 1, default: 1, description: 'Sahifa raqami' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 10,
    minimum: 1,
    maximum: 100,
    default: 10,
    description: 'Sahifadagi elementlar soni',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    enum: UserRole,
    example: UserRole.ADMIN,
    description: 'Rol bo\'yicha filter',
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
