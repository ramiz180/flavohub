import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@flavohub/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type { JwtUser } from '../auth/interfaces/jwt-user.interface';
import { PricingPreviewDto } from './dto/pricing-preview.dto';
import { UpdatePlatformPricingDto } from './dto/update-platform-pricing.dto';
import { UpdateRestaurantMarkupDto } from './dto/update-restaurant-markup.dto';
import { PricingService } from './pricing.service';

@ApiTags('admin - pricing')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
@Controller('admin')
export class PricingController {
  constructor(private readonly service: PricingService) {}

  @Get('pricing')
  @ApiOperation({ summary: 'Get global platform pricing config' })
  getPlatformPricing() {
    return this.service.getPlatformPricing();
  }

  @Patch('pricing')
  @ApiOperation({ summary: 'Update global platform pricing levers' })
  updatePlatformPricing(@Body() dto: UpdatePlatformPricingDto, @CurrentUser() user: JwtUser) {
    return this.service.updatePlatformPricing(dto, user.id);
  }

  @Patch('restaurants/:id/markup')
  @ApiOperation({ summary: 'Set or clear per-restaurant markup override' })
  updateRestaurantMarkup(
    @Param('id') id: string,
    @Body() dto: UpdateRestaurantMarkupDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.updateRestaurantMarkup(id, dto, user.id);
  }

  @Post('pricing/preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Preview full price breakdown for a given base amount',
    description:
      'Resolves the effective markup (per-restaurant override or global), applies current ' +
      'delivery fee and surge config, and returns the full breakdown. Useful for testing ' +
      'pricing config before live changes.',
  })
  previewPricing(@Body() dto: PricingPreviewDto) {
    return this.service.previewPricing(dto);
  }
}
