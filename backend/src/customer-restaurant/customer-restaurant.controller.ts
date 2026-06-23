import {
  Controller,
  Get,
  Optional,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CustomerJwtAuthGuard } from '../customer-auth/guards/customer-jwt-auth.guard';
import {
  CustomerRestaurantService,
  NearbyRestaurant,
  SearchResult,
} from './customer-restaurant.service';
import { NearbyQueryDto } from './dto/nearby-query.dto';
import { SearchQueryDto } from './dto/search-query.dto';
import { CategoryQueryDto } from './dto/category-query.dto';

interface CustomerRequest extends Express.Request {
  user: { customerId: string; phone: string; isGuest: boolean };
}

@ApiTags('customer-restaurants')
@Controller('customer/restaurants')
export class CustomerRestaurantController {
  constructor(private readonly service: CustomerRestaurantService) {}

  // ── Discovery ──────────────────────────────────────────────────────────────

  @Get('nearby')
  @ApiOperation({
    summary:
      'Get nearby restaurants (APPROVED + active + distance filter). Returns isOpen status.',
  })
  findNearby(@Query() query: NearbyQueryDto): Promise<NearbyRestaurant[]> {
    console.log('Nearby API query:', query);
    console.log('latitude:', query.latitude);
    console.log('longitude:', query.longitude);
    return this.service.findNearby(query);
  }

  @Get('search')
  @ApiOperation({
    summary: 'Search restaurants (by name/cuisine) AND food items by name. Returns { restaurants, foods }.',
  })
  search(@Query() query: SearchQueryDto): Promise<SearchResult> {
    return this.service.search(query);
  }

  @Get('category')
  @ApiOperation({
    summary:
      'Get restaurants filtered by food category (e.g. Pizza, Biryani). Only APPROVED + active + nearby.',
  })
  getByCategory(@Query() query: CategoryQueryDto): Promise<NearbyRestaurant[]> {
    return this.service.getByCategory(query);
  }

  @Get('popular')
  @ApiOperation({
    summary: 'Get popular restaurants sorted by all-time order count.',
  })
  getPopular(@Query() query: NearbyQueryDto): Promise<NearbyRestaurant[]> {
    return this.service.getPopular(query);
  }

  @Get('trending')
  @ApiOperation({
    summary: 'Get trending restaurants sorted by orders in the last 7 days.',
  })
  getTrending(@Query() query: NearbyQueryDto): Promise<NearbyRestaurant[]> {
    return this.service.getTrending(query);
  }

  @Get('recently-ordered')
  @UseGuards(CustomerJwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get the last 5 distinct restaurants the authenticated customer ordered from.',
  })
  getRecentlyOrdered(@Request() req: CustomerRequest): Promise<NearbyRestaurant[]> {
    return this.service.getRecentlyOrdered(req.user.customerId);
  }

  // ── Restaurant Detail ──────────────────────────────────────────────────────

  @Get(':id')
  @ApiOperation({ summary: 'Get restaurant detail (includes isOpen computed field)' })
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Get(':id/menu')
  @ApiOperation({
    summary:
      'Get restaurant menu grouped by category. Only APPROVED + active restaurant; only available items; only non-empty categories.',
  })
  findMenu(@Param('id') id: string) {
    return this.service.findMenu(id);
  }
}
