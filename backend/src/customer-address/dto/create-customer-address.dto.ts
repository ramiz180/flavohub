import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Matches } from 'class-validator';

export class CreateCustomerAddressDto {
  @ApiPropertyOptional({ default: 'Home' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiProperty()
  @IsString()
  address!: string;

  @ApiProperty()
  @IsString()
  city!: string;

  @ApiProperty()
  @IsString()
  state!: string;

  @ApiProperty({ example: '560001' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Enter a valid 6-digit pincode' })
  pincode!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  landmark?: string;

  @ApiProperty()
  @IsNumber()
  latitude!: number;

  @ApiProperty()
  @IsNumber()
  longitude!: number;
}
