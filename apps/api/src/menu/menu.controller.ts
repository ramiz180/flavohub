import {
  Body,
  Controller,
  Delete,
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
import type { JwtUser } from '../auth/interfaces/jwt-user.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { MenuService } from './menu.service';

@ApiTags('restaurant - menu')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.RESTAURANT_OWNER)
@Controller('restaurant/menu')
export class MenuController {
  constructor(private readonly service: MenuService) {}

  @Get()
  @ApiOperation({ summary: 'Get full menu: categories (sorted) each with their items (sorted)' })
  getFullMenu(@CurrentUser() user: JwtUser) {
    return this.service.getFullMenu(user.id);
  }

  @Post('categories')
  @ApiOperation({ summary: 'Create a menu category' })
  createCategory(@CurrentUser() user: JwtUser, @Body() dto: CreateCategoryDto) {
    return this.service.createCategory(user.id, dto);
  }

  @Patch('categories/:id')
  @ApiOperation({ summary: 'Rename or reorder a menu category' })
  updateCategory(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.service.updateCategory(user.id, id, dto);
  }

  @Delete('categories/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a category (cascades items)' })
  async deleteCategory(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    await this.service.deleteCategory(user.id, id);
  }

  @Post('items')
  @ApiOperation({ summary: 'Create a menu item' })
  createItem(@CurrentUser() user: JwtUser, @Body() dto: CreateItemDto) {
    return this.service.createItem(user.id, dto);
  }

  @Patch('items/:id')
  @ApiOperation({ summary: 'Update a menu item (fields, category, price)' })
  updateItem(@CurrentUser() user: JwtUser, @Param('id') id: string, @Body() dto: UpdateItemDto) {
    return this.service.updateItem(user.id, id, dto);
  }

  @Patch('items/:id/availability')
  @ApiOperation({ summary: 'Toggle item availability' })
  updateItemAvailability(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() dto: UpdateAvailabilityDto,
  ) {
    return this.service.updateItemAvailability(user.id, id, dto);
  }

  @Delete('items/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a menu item' })
  async deleteItem(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    await this.service.deleteItem(user.id, id);
  }
}
