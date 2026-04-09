import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';

import { CourtsService } from './courts.service';
import { CreateCourtDto, UpdateCourtDto, GetAvailabilityDto } from './dto';
import { CurrentUser, JwtPayload, Roles, Public } from '../common/decorators';

@ApiTags('Courts')
@Controller('courts')
export class CourtsController {
  constructor(private readonly courtsService: CourtsService) {}

  @Post()
  @ApiBearerAuth()
  @Roles(Role.CLUB_OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Create a new court' })
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateCourtDto,
  ) {
    return this.courtsService.create(dto, user.sub, user.roles);
  }

  @Get('club/:clubId')
  @Public()
  @ApiOperation({ summary: 'Get courts by club' })
  async findByClub(@Param('clubId') clubId: string) {
    return this.courtsService.findByClub(clubId);
  }

  @Get('club/:clubId/availability')
  @Public()
  @ApiOperation({ summary: 'Get club availability for a date' })
  async getClubAvailability(
    @Param('clubId') clubId: string,
    @Query('date') date: string,
  ) {
    return this.courtsService.getClubAvailability(clubId, date);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get court by ID' })
  async findOne(@Param('id') id: string) {
    return this.courtsService.findOne(id);
  }

  @Get(':id/availability')
  @Public()
  @ApiOperation({ summary: 'Get court availability' })
  async getAvailability(
    @Param('id') id: string,
    @Query() dto: GetAvailabilityDto,
  ) {
    return this.courtsService.getAvailability(id, dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Roles(Role.CLUB_OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Update court' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateCourtDto,
  ) {
    return this.courtsService.update(id, dto, user.sub, user.roles);
  }
}
