import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@flavohub/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type { JwtUser } from '../auth/interfaces/jwt-user.interface';
import { CouponValidationService } from './coupon-validation.service';
import { CouponsService } from './coupons.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { ListCouponsQueryDto } from './dto/list-coupons-query.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';

@ApiTags('admin - coupons')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
@Controller('admin/coupons')
export class CouponsController {
  constructor(
    private readonly couponsService: CouponsService,
    private readonly validationService: CouponValidationService,
  ) {}

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate a coupon code and compute discount (reused at checkout)' })
  validate(@Body() dto: ValidateCouponDto) {
    return this.validationService.validate({
      code: dto.code,
      orderValue: dto.orderValue,
      userId: dto.userId,
    });
  }

  @Post()
  @ApiOperation({ summary: 'Create a coupon (code stored uppercase)' })
  create(@Body() dto: CreateCouponDto, @CurrentUser() user: JwtUser) {
    return this.couponsService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List coupons with optional filters and pagination' })
  findAll(@Query() query: ListCouponsQueryDto) {
    return this.couponsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get coupon detail' })
  findOne(@Param('id') id: string) {
    return this.couponsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a coupon (including toggling isActive)' })
  update(@Param('id') id: string, @Body() dto: UpdateCouponDto, @CurrentUser() user: JwtUser) {
    return this.couponsService.update(id, dto, user.id);
  }
}
