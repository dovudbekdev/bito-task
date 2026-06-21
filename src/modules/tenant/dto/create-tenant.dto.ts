import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateTenantDto {
  @ApiProperty({ example: 'Acme Corp', description: 'Kompaniya nomi' })
  @IsString()
  @IsNotEmpty()
  name: string;
}
