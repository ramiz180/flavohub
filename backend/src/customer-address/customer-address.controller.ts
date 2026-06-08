import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CustomerJwtAuthGuard } from '../customer-auth/guards/customer-jwt-auth.guard';
import { CustomerAddressService } from './customer-address.service';
import { CreateCustomerAddressDto } from './dto/create-customer-address.dto';
import { UpdateCustomerAddressDto } from './dto/update-customer-address.dto';

interface CustomerRequest extends Express.Request {
  user: { customerId: string; phone: string; isGuest: boolean };
}

@ApiTags('customer-addresses')
@Controller('customer/addresses')
@UseGuards(CustomerJwtAuthGuard)
@ApiBearerAuth('access-token')
export class CustomerAddressController {
  constructor(private readonly addressService: CustomerAddressService) {}

  @Get()
  @ApiOperation({ summary: 'List customer addresses' })
  listAddresses(@Request() req: CustomerRequest) {
    return this.addressService.listAddresses(req.user.customerId);
  }

  @Post()
  @ApiOperation({ summary: 'Add a new address' })
  createAddress(@Request() req: CustomerRequest, @Body() dto: CreateCustomerAddressDto) {
    return this.addressService.createAddress(req.user.customerId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an address' })
  updateAddress(
    @Request() req: CustomerRequest,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerAddressDto,
  ) {
    return this.addressService.updateAddress(req.user.customerId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an address' })
  deleteAddress(@Request() req: CustomerRequest, @Param('id') id: string) {
    return this.addressService.deleteAddress(req.user.customerId, id);
  }

  @Patch(':id/default')
  @ApiOperation({ summary: 'Set address as default' })
  setDefaultAddress(@Request() req: CustomerRequest, @Param('id') id: string) {
    return this.addressService.setDefaultAddress(req.user.customerId, id);
  }
}
