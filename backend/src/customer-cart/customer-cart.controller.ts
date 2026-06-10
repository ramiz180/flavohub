import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { CustomerCartService } from './customer-cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CustomerJwtAuthGuard } from '../customer-auth/guards/customer-jwt-auth.guard';

@ApiTags('customer-cart')
@ApiBearerAuth()
@UseGuards(CustomerJwtAuthGuard)
@Controller('customer/cart')
export class CustomerCartController {
  constructor(private readonly service: CustomerCartService) {}

  @Get()
  @ApiOperation({ summary: 'Get current cart' })
  getCart(@Request() req: { user: { customerId: string } }) {
    return this.service.getCart(req.user.customerId);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add item to cart' })
  addToCart(@Request() req: { user: { customerId: string } }, @Body() dto: AddToCartDto) {
    return this.service.addToCart(req.user.customerId, dto);
  }

  @Patch('items/:menuItemId')
  @ApiOperation({ summary: 'Update item quantity (0 = remove)' })
  updateItem(
    @Request() req: { user: { customerId: string } },
    @Param('menuItemId') menuItemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.service.updateItem(req.user.customerId, menuItemId, dto);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear entire cart' })
  clearCart(@Request() req: { user: { customerId: string } }) {
    return this.service.clearCart(req.user.customerId);
  }
}
