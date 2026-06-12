import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentOrderDto {
  @ApiProperty({ example: 'cmq9b1dil0006ecvvpk7bal11' })
  @IsString()
  orderId!: string;
}
