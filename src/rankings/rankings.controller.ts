import { Controller, Get, Post, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';

import { RankingsService } from './rankings.service';
import { GetRankingsDto } from './dto';
import { CurrentUser, JwtPayload, Roles, Public } from '../common/decorators';

@ApiTags('Rankings')
@Controller('rankings')
export class RankingsController {
  constructor(private readonly rankingsService: RankingsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get rankings' })
  async getRankings(@Query() dto: GetRankingsDto) {
    return this.rankingsService.getRankings(dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my ranking' })
  async getMyRanking(@CurrentUser() user: JwtPayload) {
    return this.rankingsService.getUserRanking(user.sub);
  }

  @Get('user/:userId')
  @Public()
  @ApiOperation({ summary: 'Get user ranking' })
  async getUserRanking(@Param('userId') userId: string) {
    return this.rankingsService.getUserRanking(userId);
  }

  @Post('update')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update all rankings (admin)' })
  async updateRankings() {
    return this.rankingsService.updateRankings();
  }
}
