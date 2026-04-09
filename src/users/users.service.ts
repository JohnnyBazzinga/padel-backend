import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto, SearchUsersDto } from './dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        roles: true,
        rankings: {
          where: { category: 'GENERAL', period: 'all-time' },
          take: 1,
        },
      },
    });

    if (!user || user.isDeleted) {
      throw new NotFoundException('User not found');
    }

    return this.sanitizeUser(user);
  }

  async getProfile(userId: string) {
    return this.findById(userId);
  }

  async updateProfile(userId: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: dto,
      include: { roles: true },
    });

    return this.sanitizeUser(user);
  }

  async searchUsers(dto: SearchUsersDto, currentUserId: string) {
    const { query, city, skillLevel, page = 1, limit = 20 } = dto;

    const where: any = {
      isDeleted: false,
      isActive: true,
      id: { not: currentUserId },
    };

    if (query) {
      where.OR = [
        { firstName: { contains: query, mode: 'insensitive' } },
        { lastName: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
      ];
    }

    if (city) {
      where.city = { contains: city, mode: 'insensitive' };
    }

    if (skillLevel) {
      where.skillLevel = skillLevel;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          city: true,
          skillLevel: true,
          matchesPlayed: true,
          matchesWon: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { firstName: 'asc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPlayerStats(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        matchesPlayed: true,
        matchesWon: true,
        totalPoints: true,
        rankings: {
          where: { category: 'GENERAL', period: 'all-time' },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const winRate = user.matchesPlayed > 0
      ? (user.matchesWon / user.matchesPlayed * 100).toFixed(1)
      : '0.0';

    return {
      matchesPlayed: user.matchesPlayed,
      matchesWon: user.matchesWon,
      winRate: parseFloat(winRate),
      totalPoints: user.totalPoints,
      ranking: user.rankings[0] || null,
    };
  }

  private sanitizeUser(user: any) {
    const { passwordHash, ...rest } = user;
    return {
      ...rest,
      roles: user.roles?.map((r: any) => r.role) || [],
    };
  }
}
