import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, Min, ValidateIf } from 'class-validator';
import { MarkupType } from '@prisma/client';

/**
 * Pass { markupType, markupValue } to set an override.
 * Pass { markupType: null, markupValue: null } to clear the override and fall back to global.
 * Both fields must be set or both null together.
 */
export class UpdateRestaurantMarkupDto {
  @ApiPropertyOptional({ enum: MarkupType, nullable: true })
  @IsOptional()
  @ValidateIf((o: UpdateRestaurantMarkupDto) => o.markupType !== null)
  @IsEnum(MarkupType)
  markupType?: MarkupType | null;

  @ApiPropertyOptional({ minimum: 0, nullable: true })
  @IsOptional()
  @ValidateIf((o: UpdateRestaurantMarkupDto) => o.markupValue !== null)
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  markupValue?: number | null;
}
