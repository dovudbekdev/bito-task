import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, IJwtPayload, Roles, UserRole } from '@common';
import { QuerySalesReportDto } from '../dto';
import { SalesReportService } from '../services';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class SalesReportController {
  constructor(private readonly salesReportService: SalesReportService) {}

  @Get('sales')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getSalesReport(
    @Query() query: QuerySalesReportDto,
    @CurrentUser() actor: IJwtPayload,
  ) {
    return this.salesReportService.getSalesReport(actor, query);
  }
}
