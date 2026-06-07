import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean } from 'class-validator';

export class UpdateAvailabilityDto {
  @ApiProperty()
  @IsBoolean()
  @Type(() => Boolean)
  declare isAvailable: boolean;
}
