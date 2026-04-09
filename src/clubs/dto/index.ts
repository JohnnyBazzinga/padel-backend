import { IsString, IsOptional, IsBoolean, IsNumber, IsObject, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

export class CreateClubDto {
  @ApiProperty({ example: 'Padel Lisboa Club' })
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'Av. da Liberdade, 100' })
  @IsString()
  address: string;

  @ApiProperty({ example: 'Lisboa' })
  @IsString()
  city: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  businessHours?: Record<string, { open: string; close: string }>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasParking?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasShowers?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasLockers?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasProShop?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasCafeteria?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasWifi?: boolean;
}

export class UpdateClubDto extends PartialType(CreateClubDto) {}

export class SearchClubsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  hasParking?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  hasShowers?: boolean;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
