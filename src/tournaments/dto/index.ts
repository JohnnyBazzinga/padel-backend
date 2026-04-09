import { IsString, IsOptional, IsInt, IsEnum, IsUUID, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { SkillLevel, TournamentStatus, TournamentFormat } from '@prisma/client';

export class CreateTournamentDto {
  @ApiProperty()
  @IsUUID()
  clubId: string;

  @ApiProperty({ example: 'Torneio de Verão 2026' })
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '2026-06-01' })
  @IsString()
  startDate: string;

  @ApiProperty({ example: '2026-06-03' })
  @IsString()
  endDate: string;

  @ApiProperty({ example: '2026-05-25' })
  @IsString()
  registrationDeadline: string;

  @ApiPropertyOptional({ enum: TournamentFormat })
  @IsOptional()
  @IsEnum(TournamentFormat)
  format?: TournamentFormat;

  @ApiPropertyOptional({ default: 16 })
  @IsOptional()
  @IsInt()
  @Min(4)
  @Max(128)
  maxTeams?: number;

  @ApiPropertyOptional({ enum: SkillLevel })
  @IsOptional()
  @IsEnum(SkillLevel)
  minLevel?: SkillLevel;

  @ApiPropertyOptional({ enum: SkillLevel })
  @IsOptional()
  @IsEnum(SkillLevel)
  maxLevel?: SkillLevel;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  entryFee?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  prizePool?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rules?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;
}

export class UpdateTournamentDto extends PartialType(CreateTournamentDto) {
  @ApiPropertyOptional({ enum: TournamentStatus })
  @IsOptional()
  @IsEnum(TournamentStatus)
  status?: TournamentStatus;
}

export class SearchTournamentsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ enum: TournamentStatus })
  @IsOptional()
  @IsEnum(TournamentStatus)
  status?: TournamentStatus;

  @ApiPropertyOptional({ enum: SkillLevel })
  @IsOptional()
  @IsEnum(SkillLevel)
  minLevel?: SkillLevel;

  @ApiPropertyOptional({ enum: SkillLevel })
  @IsOptional()
  @IsEnum(SkillLevel)
  maxLevel?: SkillLevel;

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

export class RegisterPlayerDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  partnerId?: string;

  @ApiPropertyOptional({ example: 'Os Invencíveis' })
  @IsOptional()
  @IsString()
  teamName?: string;
}

export class UpdateBracketDto {
  @ApiProperty()
  @IsString()
  winnerId: string;

  @ApiProperty({ example: '6-4 6-3' })
  @IsString()
  score: string;
}
