import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@flavohub/shared';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AdminService } from './admin.service';

@ApiTags('admin-payments')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/payments')
export class AdminPaymentController {
  constructor(private readonly adminService: AdminService) {}

  @Get('summary')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get overall payment summary stats for the platform' })
  getSummary() {
    return this.adminService.getPaymentSummary();
  }
}
