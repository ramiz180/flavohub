import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SearchQueryDto {
  @ApiProperty({ example: 'biryani', description: 'Search term (food name, restaurant name, or cuisine)' })
  @IsString()
  declare q: string;

  @ApiPropertyOptional({ example: 22.77, description: 'Customer latitude for sorting results by proximity' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ example: 88.43, description: 'Customer longitude for sorting results by proximity' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ example: 10, description: 'Radius in km (default 50 = show all)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  radius?: number = 50;
}
