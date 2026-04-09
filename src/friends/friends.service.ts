import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { InviteStatus, NotificationType } from '@prisma/client';

@Injectable()
export class FriendsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async sendFriendRequest(userId: string, friendId: string) {
    if (userId === friendId) {
      throw new BadRequestException('Cannot send friend request to yourself');
    }

    const friend = await this.prisma.user.findUnique({ where: { id: friendId } });
    if (!friend || friend.isDeleted) {
      throw new NotFoundException('User not found');
    }

    const existing = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { initiatorId: userId, receiverId: friendId },
          { initiatorId: friendId, receiverId: userId },
        ],
      },
    });

    if (existing) {
      if (existing.status === InviteStatus.ACCEPTED) {
        throw new BadRequestException('Already friends');
      }
      if (existing.status === InviteStatus.PENDING) {
        throw new BadRequestException('Friend request already pending');
      }
    }

    const friendship = await this.prisma.friendship.create({
      data: {
        initiatorId: userId,
        receiverId: friendId,
        status: InviteStatus.PENDING,
      },
      include: {
        initiator: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await this.notificationsService.create(
      friendId,
      NotificationType.FRIEND_REQUEST,
      'Pedido de Amizade',
      `${friendship.initiator.firstName} ${friendship.initiator.lastName} enviou-te um pedido de amizade`,
      { friendshipId: friendship.id, userId },
    );

    return friendship;
  }

  async acceptFriendRequest(userId: string, friendshipId: string) {
    const friendship = await this.prisma.friendship.findUnique({
      where: { id: friendshipId },
    });

    if (!friendship) {
      throw new NotFoundException('Friend request not found');
    }

    if (friendship.receiverId !== userId) {
      throw new BadRequestException('Cannot accept this request');
    }

    if (friendship.status !== InviteStatus.PENDING) {
      throw new BadRequestException('Request is no longer pending');
    }

    return this.prisma.friendship.update({
      where: { id: friendshipId },
      data: { status: InviteStatus.ACCEPTED },
      include: {
        initiator: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        receiver: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });
  }

  async rejectFriendRequest(userId: string, friendshipId: string) {
    const friendship = await this.prisma.friendship.findUnique({
      where: { id: friendshipId },
    });

    if (!friendship) {
      throw new NotFoundException('Friend request not found');
    }

    if (friendship.receiverId !== userId) {
      throw new BadRequestException('Cannot reject this request');
    }

    return this.prisma.friendship.update({
      where: { id: friendshipId },
      data: { status: InviteStatus.REJECTED },
    });
  }

  async removeFriend(userId: string, friendId: string) {
    const friendship = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { initiatorId: userId, receiverId: friendId },
          { initiatorId: friendId, receiverId: userId },
        ],
        status: InviteStatus.ACCEPTED,
      },
    });

    if (!friendship) {
      throw new NotFoundException('Friendship not found');
    }

    await this.prisma.friendship.delete({ where: { id: friendship.id } });

    return { success: true };
  }

  async getFriends(userId: string) {
    const friendships = await this.prisma.friendship.findMany({
      where: {
        OR: [
          { initiatorId: userId },
          { receiverId: userId },
        ],
        status: InviteStatus.ACCEPTED,
      },
      include: {
        initiator: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true, city: true, skillLevel: true },
        },
        receiver: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true, city: true, skillLevel: true },
        },
      },
    });

    return friendships.map((f) => ({
      id: f.id,
      friend: f.initiatorId === userId ? f.receiver : f.initiator,
      since: f.updatedAt,
    }));
  }

  async getPendingRequests(userId: string) {
    return this.prisma.friendship.findMany({
      where: {
        receiverId: userId,
        status: InviteStatus.PENDING,
      },
      include: {
        initiator: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true, city: true, skillLevel: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSentRequests(userId: string) {
    return this.prisma.friendship.findMany({
      where: {
        initiatorId: userId,
        status: InviteStatus.PENDING,
      },
      include: {
        receiver: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true, city: true, skillLevel: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async areFriends(userId: string, otherUserId: string): Promise<boolean> {
    const friendship = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { initiatorId: userId, receiverId: otherUserId },
          { initiatorId: otherUserId, receiverId: userId },
        ],
        status: InviteStatus.ACCEPTED,
      },
    });

    return !!friendship;
  }
}
