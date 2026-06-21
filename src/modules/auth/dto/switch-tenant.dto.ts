import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty } from 'class-validator';

export class SwitchTenantDto {
  @ApiProperty({ example: 1, description: 'Faol tenant ID' })
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  tenantId: number;
}
