import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: 'newPassword123', minLength: 8, description: 'Yangi parol' })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
