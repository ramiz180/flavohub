import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@flavohub/shared';
import type { JwtUser } from '../auth/interfaces/jwt-user.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { SetHoursDto } from './dto/set-hours.dto';
import { UpdateOwnerProfileDto } from './dto/update-owner-profile.dto';
import { OwnerRestaurantService } from './owner-restaurant.service';

@ApiTags('restaurant - owner self-service')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.RESTAURANT_OWNER)
@Controller('restaurant')
export class OwnerRestaurantController {
  constructor(private readonly service: OwnerRestaurantService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get own restaurant profile including hours and status' })
  getProfile(@CurrentUser() user: JwtUser) {
    return this.service.getProfile(user.id);
  }

  @Patch('profile')
  @ApiOperation({
    summary:
      'Update own restaurant profile fields (name, description, address, contact, cuisine, coords)',
  })
  updateProfile(@CurrentUser() user: JwtUser, @Body() dto: UpdateOwnerProfileDto) {
    return this.service.updateProfile(user.id, dto);
  }

  @Put('hours')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set operating hours for all 7 days (upsert)' })
  setHours(@CurrentUser() user: JwtUser, @Body() dto: SetHoursDto) {
    return this.service.setHours(user.id, dto);
  }
}
