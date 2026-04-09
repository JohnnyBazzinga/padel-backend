import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { MatchesService } from './matches.service';
import { CreateMatchDto, SearchMatchesDto, JoinMatchDto, InviteToMatchDto, RecordScoreDto } from './dto';
import { CurrentUser, JwtPayload, Public } from '../common/decorators';

@ApiTags('Matches')
@Controller('matches')
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a match' })
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateMatchDto,
  ) {
    return this.matchesService.create(dto, user.sub);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Search matches' })
  async findAll(@Query() dto: SearchMatchesDto) {
    return this.matchesService.findAll(dto);
  }

  @Get('my')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my matches' })
  async findMyMatches(
    @CurrentUser() user: JwtPayload,
    @Query('upcoming') upcoming?: boolean,
  ) {
    return this.matchesService.findMyMatches(user.sub, upcoming !== false);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get match by ID' })
  async findOne(@Param('id') id: string) {
    return this.matchesService.findOne(id);
  }

  @Post(':id/join')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Join a match' })
  async join(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: JoinMatchDto,
  ) {
    return this.matchesService.join(id, dto, user.sub);
  }

  @Post(':id/leave')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Leave a match' })
  async leave(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.matchesService.leave(id, user.sub);
  }

  @Post(':id/invite')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Invite player to match' })
  async invitePlayer(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: InviteToMatchDto,
  ) {
    return this.matchesService.invitePlayer(id, dto, user.sub);
  }

  @Patch(':id/score')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Record match score' })
  async recordScore(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RecordScoreDto,
  ) {
    return this.matchesService.recordScore(id, dto, user.sub);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel match' })
  async cancel(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.matchesService.cancel(id, user.sub);
  }
}
