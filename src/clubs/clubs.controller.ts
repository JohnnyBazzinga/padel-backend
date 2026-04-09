import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';

import { ClubsService } from './clubs.service';
import { CreateClubDto, UpdateClubDto, SearchClubsDto } from './dto';
import { CurrentUser, JwtPayload, Roles, Public } from '../common/decorators';

@ApiTags('Clubs')
@Controller('clubs')
export class ClubsController {
  constructor(private readonly clubsService: ClubsService) {}

  @Post()
  @ApiBearerAuth()
  @Roles(Role.CLUB_OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Create a new club' })
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateClubDto,
  ) {
    return this.clubsService.create(dto, user.sub);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'List all clubs' })
  async findAll(@Query() dto: SearchClubsDto) {
    return this.clubsService.findAll(dto);
  }

  @Get('my')
  @ApiBearerAuth()
  @Roles(Role.CLUB_OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Get my clubs' })
  async getMyClubs(@CurrentUser() user: JwtPayload) {
    return this.clubsService.getMyClubs(user.sub);
  }

  @Get('nearby')
  @Public()
  @ApiOperation({ summary: 'Get nearby clubs' })
  async getNearbyClubs(
    @Query('latitude') latitude: number,
    @Query('longitude') longitude: number,
    @Query('radius') radius?: number,
  ) {
    return this.clubsService.getNearbyClubs(latitude, longitude, radius);
  }

  @Get('slug/:slug')
  @Public()
  @ApiOperation({ summary: 'Get club by slug' })
  async findBySlug(@Param('slug') slug: string) {
    return this.clubsService.findBySlug(slug);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get club by ID' })
  async findOne(@Param('id') id: string) {
    return this.clubsService.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Roles(Role.CLUB_OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Update club' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateClubDto,
  ) {
    return this.clubsService.update(id, dto, user.sub, user.roles);
  }
}
