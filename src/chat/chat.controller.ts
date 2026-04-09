import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { ChatService } from './chat.service';
import { SendMessageDto } from './dto';
import { CurrentUser, JwtPayload } from '../common/decorators';

@ApiTags('Chat')
@ApiBearerAuth()
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversations')
  @ApiOperation({ summary: 'Get all conversations' })
  async getConversations(@CurrentUser() user: JwtPayload) {
    return this.chatService.getConversations(user.sub);
  }

  @Post('conversations/:userId')
  @ApiOperation({ summary: 'Get or create conversation with user' })
  async getOrCreateConversation(
    @CurrentUser() user: JwtPayload,
    @Param('userId') otherUserId: string,
  ) {
    return this.chatService.getOrCreateConversation(user.sub, otherUserId);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Get conversation messages' })
  async getMessages(
    @Param('id') conversationId: string,
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.chatService.getMessages(conversationId, user.sub, page, limit);
  }

  @Post('messages')
  @ApiOperation({ summary: 'Send a message' })
  async sendMessage(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(dto, user.sub);
  }

  @Post('conversations/:id/read')
  @ApiOperation({ summary: 'Mark conversation as read' })
  async markAsRead(
    @Param('id') conversationId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.chatService.markAsRead(conversationId, user.sub);
  }
}
