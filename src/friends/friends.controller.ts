import { Controller, Get, Post, Delete, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { FriendsService } from './friends.service';
import { CurrentUser, JwtPayload } from '../common/decorators';

@ApiTags('Friends')
@ApiBearerAuth()
@Controller('friends')
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Get()
  @ApiOperation({ summary: 'Get friends list' })
  async getFriends(@CurrentUser() user: JwtPayload) {
    return this.friendsService.getFriends(user.sub);
  }

  @Get('requests/pending')
  @ApiOperation({ summary: 'Get pending friend requests' })
  async getPendingRequests(@CurrentUser() user: JwtPayload) {
    return this.friendsService.getPendingRequests(user.sub);
  }

  @Get('requests/sent')
  @ApiOperation({ summary: 'Get sent friend requests' })
  async getSentRequests(@CurrentUser() user: JwtPayload) {
    return this.friendsService.getSentRequests(user.sub);
  }

  @Post('request/:userId')
  @ApiOperation({ summary: 'Send friend request' })
  async sendRequest(
    @CurrentUser() user: JwtPayload,
    @Param('userId') friendId: string,
  ) {
    return this.friendsService.sendFriendRequest(user.sub, friendId);
  }

  @Post('accept/:friendshipId')
  @ApiOperation({ summary: 'Accept friend request' })
  async acceptRequest(
    @CurrentUser() user: JwtPayload,
    @Param('friendshipId') friendshipId: string,
  ) {
    return this.friendsService.acceptFriendRequest(user.sub, friendshipId);
  }

  @Post('reject/:friendshipId')
  @ApiOperation({ summary: 'Reject friend request' })
  async rejectRequest(
    @CurrentUser() user: JwtPayload,
    @Param('friendshipId') friendshipId: string,
  ) {
    return this.friendsService.rejectFriendRequest(user.sub, friendshipId);
  }

  @Delete(':userId')
  @ApiOperation({ summary: 'Remove friend' })
  async removeFriend(
    @CurrentUser() user: JwtPayload,
    @Param('userId') friendId: string,
  ) {
    return this.friendsService.removeFriend(user.sub, friendId);
  }
}
