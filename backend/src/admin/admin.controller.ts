import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@flavohub/shared';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('admin')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin')
export class AdminController {
  @Get('ping')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Liveness check for SUPER_ADMIN' })
  @ApiOkResponse({ schema: { properties: { pong: { type: 'boolean', example: true } } } })
  ping(): { pong: boolean } {
    return { pong: true };
  }
}
