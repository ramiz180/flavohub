import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RejectOrderDto {
  @ApiProperty({ example: 'Item unavailable right now' })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
