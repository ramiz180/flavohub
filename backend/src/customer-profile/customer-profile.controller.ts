import { Body, Controller, Get, Patch, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CustomerJwtAuthGuard } from '../customer-auth/guards/customer-jwt-auth.guard';
import { CustomerProfileService } from './customer-profile.service';
import { UpdateCustomerProfileDto } from './dto/update-customer-profile.dto';

interface CustomerRequest extends Express.Request {
  user: { customerId: string; phone: string; isGuest: boolean };
}

@ApiTags('customer-profile')
@Controller('customer/profile')
@UseGuards(CustomerJwtAuthGuard)
@ApiBearerAuth('access-token')
export class CustomerProfileController {
  constructor(private readonly profileService: CustomerProfileService) {}

  @Get()
  @ApiOperation({ summary: 'Get customer profile' })
  getProfile(@Request() req: CustomerRequest) {
    return this.profileService.getProfile(req.user.customerId);
  }

  @Patch()
  @ApiOperation({ summary: 'Update customer profile' })
  updateProfile(@Request() req: CustomerRequest, @Body() dto: UpdateCustomerProfileDto) {
    return this.profileService.updateProfile(req.user.customerId, dto);
  }
}
