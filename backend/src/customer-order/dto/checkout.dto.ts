import {
  IsString,
  IsOptional,
  MaxLength,
  IsEnum,
  IsNumber,
  IsArray,
  ValidateNested,
  IsNotEmpty,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CheckoutItemDto {
  @ApiProperty({ example: 'menu-item-uuid' })
  @IsString()
  @IsNotEmpty()
  menuItemId!: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(1)
  quantity!: number;
}

export class CheckoutDto {
  @ApiProperty({ example: 'customer-uuid' })
  @IsString()
  @IsNotEmpty()
  customerId!: string;

  @ApiProperty({ example: 'restaurant-uuid' })
  @IsString()
  @IsNotEmpty()
  restaurantId!: string;

  @ApiProperty({ example: 'address-uuid' })
  @IsString()
  @IsNotEmpty()
  addressId!: string;

  @ApiProperty({ type: [CheckoutItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items!: CheckoutItemDto[];

  /**
   * Frontend-supplied totals are accepted but IGNORED on the server.
   * The backend recalculates all amounts from current database prices.
   * These fields are optional to avoid breaking older app versions.
   */
  @ApiPropertyOptional({ example: 500, description: 'Frontend subtotal (informational only – server recalculates)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  subtotal?: number;

  @ApiPropertyOptional({ example: 40, description: 'Frontend delivery fee (informational only)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  deliveryFee?: number;

  @ApiPropertyOptional({ example: 25, description: 'Frontend taxes (informational only)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxes?: number;

  @ApiPropertyOptional({ example: 565, description: 'Frontend total (informational only – server recalculates)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  total?: number;

  @ApiPropertyOptional({ example: 'Leave at door' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;

  @ApiPropertyOptional({ enum: PaymentMethod, example: PaymentMethod.ONLINE })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ example: 'coupon-uuid', description: 'Optional coupon/promo code ID' })
  @IsOptional()
  @IsString()
  couponId?: string;
}
