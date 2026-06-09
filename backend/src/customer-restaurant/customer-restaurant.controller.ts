import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CustomerRestaurantService } from './customer-restaurant.service';
import { NearbyQueryDto } from './dto/nearby-query.dto';

@ApiTags('customer-restaurants')
@Controller('customer/restaurants')
export class CustomerRestaurantController {
  constructor(private readonly service: CustomerRestaurantService) {}

  @Get('nearby')
  @ApiOperation({ summary: 'Get nearby restaurants by coordinates' })
  findNearby(@Query() query: NearbyQueryDto) {
    return this.service.findNearby(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get restaurant detail' })
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Get(':id/menu')
  @ApiOperation({ summary: 'Get restaurant menu grouped by category' })
  findMenu(@Param('id') id: string) {
    return this.service.findMenu(id);
  }
}
