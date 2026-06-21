import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { UserRole } from '@common';

export class CreateUserDto {
  @ApiProperty({ example: 'John Doe', description: 'Foydalanuvchi ismi' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'john_doe', minLength: 3, description: 'Noyob login' })
  @IsString()
  @MinLength(3)
  login: string;

  @ApiProperty({ example: 'password123', minLength: 8, description: 'Parol' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({
    enum: UserRole,
    example: UserRole.ADMIN,
    description: 'Foydalanuvchi roli',
  })
  @IsEnum(UserRole)
  role: UserRole;
}
