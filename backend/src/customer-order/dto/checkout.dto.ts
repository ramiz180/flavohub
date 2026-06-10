import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CheckoutDto {
  @ApiProperty({ example: '12 Main St, Bangalore 560001' })
  @IsString()
  deliveryAddress!: string;

  @ApiPropertyOptional({ example: 'Leave at door' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}
