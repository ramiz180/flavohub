import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListCustomerOrdersQueryDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  @ApiPropertyOptional({ enum: OrderStatus })
  status?: OrderStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @ApiPropertyOptional({ default: 1 })
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @ApiPropertyOptional({ default: 20 })
  pageSize?: number = 20;
}
