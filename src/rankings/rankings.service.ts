import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GetRankingsDto } from './dto';

@Injectable()
export class RankingsService {
  constructor(private prisma: PrismaService) {}

  async getRankings(dto: GetRankingsDto) {
    const { category = 'GENERAL', categoryId = '', period = 'all-time', page = 1, limit = 50 } = dto;

    const [rankings, total] = await Promise.all([
      this.prisma.ranking.findMany({
        where: {
          category,
          categoryId: categoryId || '',
          period,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
              city: true,
              skillLevel: true,
            },
          },
        },
        orderBy: { position: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.ranking.count({
        where: { category, categoryId: categoryId || '', period },
      }),
    ]);

    return {
      data: rankings,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getUserRanking(userId: string, category: string = 'GENERAL', period: string = 'all-time') {
    return this.prisma.ranking.findFirst({
      where: {
        userId,
        category,
        period,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            skillLevel: true,
          },
        },
      },
    });
  }

  async updateRankings() {
    const users = await this.prisma.user.findMany({
      where: { isDeleted: false, isActive: true },
      select: {
        id: true,
        matchesPlayed: true,
        matchesWon: true,
        totalPoints: true,
      },
      orderBy: { totalPoints: 'desc' },
    });

    const updates = users.map((user, index) => {
      const winRate = user.matchesPlayed > 0
        ? user.matchesWon / user.matchesPlayed
        : 0;

      return this.prisma.ranking.upsert({
        where: {
          userId_category_categoryId_period: {
            userId: user.id,
            category: 'GENERAL',
            categoryId: '',
            period: 'all-time',
          },
        },
        update: {
          points: user.totalPoints,
          position: index + 1,
          matchesPlayed: user.matchesPlayed,
          matchesWon: user.matchesWon,
          winRate,
          tier: this.calculateTier(user.totalPoints),
        },
        create: {
          userId: user.id,
          category: 'GENERAL',
          categoryId: '',
          period: 'all-time',
          points: user.totalPoints,
          position: index + 1,
          matchesPlayed: user.matchesPlayed,
          matchesWon: user.matchesWon,
          winRate,
          tier: this.calculateTier(user.totalPoints),
        },
      });
    });

    await this.prisma.$transaction(updates);

    return { updated: users.length };
  }

  async addPoints(userId: string, points: number, reason: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        totalPoints: { increment: points },
      },
    });

    return this.getUserRanking(userId);
  }

  async recordMatchResult(winnerId: string, loserId: string) {
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: winnerId },
        data: {
          matchesPlayed: { increment: 1 },
          matchesWon: { increment: 1 },
          totalPoints: { increment: 25 },
        },
      }),
      this.prisma.user.update({
        where: { id: loserId },
        data: {
          matchesPlayed: { increment: 1 },
          totalPoints: { increment: 5 },
        },
      }),
    ]);

    await this.updateRankings();
  }

  private calculateTier(points: number): string {
    if (points >= 5000) return 'DIAMOND';
    if (points >= 2500) return 'PLATINUM';
    if (points >= 1000) return 'GOLD';
    if (points >= 500) return 'SILVER';
    return 'BRONZE';
  }
}
