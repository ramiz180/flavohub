import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, IsUrl, MinLength } from 'class-validator';
import { IsDecimalPositive } from '../validators/is-decimal-positive.validator';

export class CreateItemDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  declare categoryId: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  declare name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Price with up to 2 decimal places', example: '9.99' })
  @IsDecimalPositive()
  declare price: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isAvailable?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
