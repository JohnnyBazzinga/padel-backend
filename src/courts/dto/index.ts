import { IsString, IsOptional, IsBoolean, IsInt, Min, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateCourtDto {
  @ApiProperty()
  @IsUUID()
  clubId: string;

  @ApiProperty({ example: 'Campo 1' })
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  courtNumber: number;

  @ApiPropertyOptional({ example: 'ARTIFICIAL_GRASS' })
  @IsOptional()
  @IsString()
  surface?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isIndoor?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasLighting?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasCovering?: boolean;

  @ApiPropertyOptional({ example: 2000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  pricePerHour?: number;

  @ApiPropertyOptional({ example: 3000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  pricePerHourPeak?: number;

  @ApiPropertyOptional({ example: '18:00' })
  @IsOptional()
  @IsString()
  peakHoursStart?: string;

  @ApiPropertyOptional({ example: '22:00' })
  @IsOptional()
  @IsString()
  peakHoursEnd?: string;
}

export class UpdateCourtDto extends PartialType(CreateCourtDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isUnderMaintenance?: boolean;
}

export class GetAvailabilityDto {
  @ApiProperty({ example: '2026-03-20' })
  @IsString()
  date: string;
}
