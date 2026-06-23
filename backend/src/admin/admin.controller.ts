import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@flavohub/shared';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AdminService } from './admin.service';

@ApiTags('admin')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}
  @Get('ping')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Liveness check for SUPER_ADMIN' })
  @ApiOkResponse({ schema: { properties: { pong: { type: 'boolean', example: true } } } })
  ping(): { pong: boolean } {
    return { pong: true };
  }

  @Get('orders')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all customer orders for platform' })
  getAllOrders(
    @Query('page') page: string,
    @Query('pageSize') pageSize: string
  ) {
    const p = parseInt(page, 10) || 1;
    const ps = parseInt(pageSize, 10) || 50;
    return this.adminService.getAllCustomerOrders(p, ps);
  }

  @Get('stats')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get platform stats' })
  getPlatformStats() {
    return this.adminService.getPlatformStats();
  }
}
