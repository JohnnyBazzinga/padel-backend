import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';

import { TournamentsService } from './tournaments.service';
import { CreateTournamentDto, UpdateTournamentDto, SearchTournamentsDto, RegisterPlayerDto, UpdateBracketDto } from './dto';
import { CurrentUser, JwtPayload, Roles, Public } from '../common/decorators';

@ApiTags('Tournaments')
@Controller('tournaments')
export class TournamentsController {
  constructor(private readonly tournamentsService: TournamentsService) {}

  @Post()
  @ApiBearerAuth()
  @Roles(Role.CLUB_OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Create a tournament' })
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateTournamentDto,
  ) {
    return this.tournamentsService.create(dto, user.sub, user.roles);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Search tournaments' })
  async findAll(@Query() dto: SearchTournamentsDto) {
    return this.tournamentsService.findAll(dto);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get tournament by ID' })
  async findOne(@Param('id') id: string) {
    return this.tournamentsService.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Roles(Role.CLUB_OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Update tournament' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateTournamentDto,
  ) {
    return this.tournamentsService.update(id, dto, user.sub, user.roles);
  }

  @Post(':id/register')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register for tournament' })
  async register(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RegisterPlayerDto,
  ) {
    return this.tournamentsService.register(id, dto, user.sub);
  }

  @Delete(':id/register')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unregister from tournament' })
  async unregister(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tournamentsService.unregister(id, user.sub);
  }

  @Post(':id/brackets')
  @ApiBearerAuth()
  @Roles(Role.CLUB_OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Generate tournament brackets' })
  async generateBrackets(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tournamentsService.generateBrackets(id, user.sub, user.roles);
  }

  @Patch(':id/brackets/:bracketId')
  @ApiBearerAuth()
  @Roles(Role.CLUB_OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Update bracket result' })
  async updateBracketResult(
    @Param('id') id: string,
    @Param('bracketId') bracketId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateBracketDto,
  ) {
    return this.tournamentsService.updateBracketResult(id, bracketId, dto.winnerId, dto.score, user.sub, user.roles);
  }
}
