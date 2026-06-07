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
import { AssignOwnerDto } from './dto/assign-owner.dto';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { ListRestaurantsQueryDto } from './dto/list-restaurants-query.dto';
import { RejectRestaurantDto } from './dto/reject-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { RestaurantsService } from './restaurants.service';

@ApiTags('admin - restaurants')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
@Controller('admin/restaurants')
export class RestaurantsController {
  constructor(private readonly service: RestaurantsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a restaurant (admin manual onboarding)' })
  create(@Body() dto: CreateRestaurantDto, @CurrentUser() user: JwtUser) {
    return this.service.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List restaurants with filters and pagination' })
  findAll(@Query() query: ListRestaurantsQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get restaurant detail including hours' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update restaurant profile fields' })
  update(@Param('id') id: string, @Body() dto: UpdateRestaurantDto, @CurrentUser() user: JwtUser) {
    return this.service.update(id, dto, user.id);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a pending restaurant (PENDING -> APPROVED)' })
  approve(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.service.approve(id, user.id);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a pending restaurant (PENDING -> REJECTED)' })
  reject(@Param('id') id: string, @Body() dto: RejectRestaurantDto, @CurrentUser() user: JwtUser) {
    return this.service.reject(id, dto, user.id);
  }

  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate an approved restaurant (requires APPROVED status)' })
  activate(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.service.activate(id, user.id);
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate a restaurant' })
  deactivate(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.service.deactivate(id, user.id);
  }

  @Post(':id/owner')
  @ApiOperation({ summary: 'Create and assign a RESTAURANT_OWNER account to a restaurant' })
  assignOwner(@Param('id') id: string, @Body() dto: AssignOwnerDto, @CurrentUser() user: JwtUser) {
    return this.service.assignOwner(id, dto, user.id);
  }
}
