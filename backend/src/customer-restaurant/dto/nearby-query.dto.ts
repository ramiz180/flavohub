import { IsNumber, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class NearbyQueryDto {
  @ApiPropertyOptional({ example: 12.29, description: 'Latitude' })
  @Type(() => Number)
  @IsNumber()
  declare latitude: number;

  @ApiPropertyOptional({ example: 76.64, description: 'Longitude' })
  @Type(() => Number)
  @IsNumber()
  declare longitude: number;

  @ApiPropertyOptional({ example: 5, description: 'Radius in km', default: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  radius?: number = 5;
}
