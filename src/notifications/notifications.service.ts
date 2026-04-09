import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, type: NotificationType, title: string, message: string, data?: any) {
    return this.prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        data: data ? JSON.stringify(data) : null,
      },
    });
  }

  async getNotifications(userId: string, page: number = 1, limit: number = 20) {
    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return {
      data: notifications.map((n) => ({
        ...n,
        data: n.data ? JSON.parse(n.data) : null,
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit), unreadCount },
    };
  }

  async markAsRead(notificationId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  async sendBookingReminder(userId: string, bookingDetails: any) {
    return this.create(
      userId,
      NotificationType.BOOKING_REMINDER,
      'Lembrete de Reserva',
      `A sua reserva no ${bookingDetails.clubName} é amanhã às ${bookingDetails.time}`,
      bookingDetails,
    );
  }

  async sendMatchInvite(userId: string, inviterName: string, matchDetails: any) {
    return this.create(
      userId,
      NotificationType.MATCH_INVITE,
      'Convite para Jogo',
      `${inviterName} convidou-te para jogar padel`,
      matchDetails,
    );
  }

  async sendMatchFound(userId: string, matchDetails: any) {
    return this.create(
      userId,
      NotificationType.MATCH_FOUND,
      'Jogo Encontrado',
      'Encontrámos um jogo que pode interessar-te',
      matchDetails,
    );
  }

  async sendRankingUpdate(userId: string, newPosition: number, oldPosition: number) {
    const change = oldPosition - newPosition;
    const direction = change > 0 ? 'subiste' : 'desceste';

    return this.create(
      userId,
      NotificationType.RANKING_UPDATE,
      'Atualização de Ranking',
      `${direction} ${Math.abs(change)} posições no ranking! Agora estás em ${newPosition}º lugar.`,
      { newPosition, oldPosition, change },
    );
  }
}
