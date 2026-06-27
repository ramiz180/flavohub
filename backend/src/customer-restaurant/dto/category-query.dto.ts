import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CategoryQueryDto {
  @ApiProperty({ example: 'Pizza', description: 'Food category / cuisine label to filter by' })
  @IsString()
  declare name: string;

  @ApiPropertyOptional({ example: 22.77, description: 'Customer latitude' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ example: 88.43, description: 'Customer longitude' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ example: 10, description: 'Radius in km', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  radius?: number = 10;
}
