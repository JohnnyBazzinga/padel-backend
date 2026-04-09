import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SendMessageDto } from './dto';
import { ChatMessageStatus } from '@prisma/client';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async getConversations(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        OR: [
          { participant1Id: userId },
          { participant2Id: userId },
        ],
      },
      include: {
        participant1: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
        participant2: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    return conversations.map((conv) => ({
      ...conv,
      otherUser: conv.participant1Id === userId ? conv.participant2 : conv.participant1,
      lastMessage: conv.messages[0] || null,
      unreadCount: 0,
    }));
  }

  async getOrCreateConversation(userId: string, otherUserId: string) {
    const [id1, id2] = [userId, otherUserId].sort();

    let conversation = await this.prisma.conversation.findFirst({
      where: {
        OR: [
          { participant1Id: id1, participant2Id: id2 },
          { participant1Id: id2, participant2Id: id1 },
        ],
      },
      include: {
        participant1: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
        participant2: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          participant1Id: id1,
          participant2Id: id2,
        },
        include: {
          participant1: {
            select: { id: true, firstName: true, lastName: true, avatarUrl: true },
          },
          participant2: {
            select: { id: true, firstName: true, lastName: true, avatarUrl: true },
          },
        },
      });
    }

    return {
      ...conversation,
      otherUser: conversation.participant1Id === userId ? conversation.participant2 : conversation.participant1,
    };
  }

  async getMessages(conversationId: string, userId: string, page: number = 1, limit: number = 50) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
      throw new ForbiddenException('Not authorized to view this conversation');
    }

    const [messages, total] = await Promise.all([
      this.prisma.chatMessage.findMany({
        where: { conversationId },
        include: {
          sender: {
            select: { id: true, firstName: true, lastName: true, avatarUrl: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.chatMessage.count({ where: { conversationId } }),
    ]);

    return {
      data: messages.reverse(),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async sendMessage(dto: SendMessageDto, senderId: string) {
    const conversation = await this.getOrCreateConversation(senderId, dto.receiverId);

    const message = await this.prisma.chatMessage.create({
      data: {
        conversationId: conversation.id,
        senderId,
        content: dto.content,
        status: ChatMessageStatus.SENT,
      },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    return message;
  }

  async markAsRead(conversationId: string, userId: string) {
    await this.prisma.chatMessage.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        status: { not: ChatMessageStatus.READ },
      },
      data: {
        status: ChatMessageStatus.READ,
        readAt: new Date(),
      },
    });

    return { success: true };
  }

  async markMessageAsDelivered(messageId: string) {
    return this.prisma.chatMessage.update({
      where: { id: messageId },
      data: { status: ChatMessageStatus.DELIVERED },
    });
  }
}
