import { IsString, IsOptional, MaxLength, IsEnum, IsNumber, IsArray, ValidateNested, IsNotEmpty, Min } from 'class-validator';
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

  @ApiProperty({ example: 500 })
  @IsNumber()
  @Min(0)
  subtotal!: number;

  @ApiProperty({ example: 40 })
  @IsNumber()
  @Min(0)
  deliveryFee!: number;

  @ApiProperty({ example: 25 })
  @IsNumber()
  @Min(0)
  taxes!: number;

  @ApiProperty({ example: 565 })
  @IsNumber()
  @Min(0)
  total!: number;

  @ApiPropertyOptional({ example: 'Leave at door' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;

  @ApiPropertyOptional({ enum: PaymentMethod, example: PaymentMethod.ONLINE })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;
}
