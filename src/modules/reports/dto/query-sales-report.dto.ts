import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class QuerySalesReportDto {
  @ApiPropertyOptional({
    example: '2026-06-01',
    description: 'Start date (inclusive, ISO date)',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    example: '2026-06-21',
    description: 'End date (inclusive, ISO date)',
  })
  @IsOptional()
  @IsDateString()
  to?: string;
}
