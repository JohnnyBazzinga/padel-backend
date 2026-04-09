import { Controller, Get, Patch, Body, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { UsersService } from './users.service';
import { UpdateUserDto, SearchUsersDto } from './dto';
import { CurrentUser, JwtPayload } from '../common/decorators';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@CurrentUser() user: JwtPayload) {
    return this.usersService.getProfile(user.sub);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  async updateProfile(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.updateProfile(user.sub, dto);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search users' })
  async searchUsers(
    @CurrentUser() user: JwtPayload,
    @Query() dto: SearchUsersDto,
  ) {
    return this.usersService.searchUsers(dto, user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  async getUser(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get player statistics' })
  async getPlayerStats(@Param('id') id: string) {
    return this.usersService.getPlayerStats(id);
  }
}
