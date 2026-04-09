import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CreateMatchDto, SearchMatchesDto, JoinMatchDto, InviteToMatchDto, RecordScoreDto } from './dto';
import { MatchStatus, SkillLevel } from '@prisma/client';

@Injectable()
export class MatchesService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  async create(dto: CreateMatchDto, userId: string) {
    const match = await this.prisma.match.create({
      data: {
        title: dto.title,
        description: dto.description,
        courtId: dto.courtId,
        bookingId: dto.bookingId,
        date: new Date(dto.date),
        startTime: dto.startTime,
        endTime: dto.endTime,
        minLevel: dto.minLevel || SkillLevel.BEGINNER,
        maxLevel: dto.maxLevel || SkillLevel.PROFESSIONAL,
        playersNeeded: dto.playersNeeded || 4,
        isPrivate: dto.isPrivate || false,
        location: dto.location,
        city: dto.city,
        status: MatchStatus.LOOKING_FOR_PLAYERS,
        players: {
          create: {
            userId,
            team: 1,
            isOrganizer: true,
            confirmedAt: new Date(),
          },
        },
      },
      include: {
        players: { include: { user: true } },
        court: { include: { club: true } },
      },
    });

    return match;
  }

  async findAll(dto: SearchMatchesDto) {
    const { city, minLevel, maxLevel, date, status, page = 1, limit = 20 } = dto;

    const where: any = {
      isPrivate: false,
    };

    if (city) {
      where.OR = [
        { city: { contains: city, mode: 'insensitive' } },
        { court: { club: { city: { contains: city, mode: 'insensitive' } } } },
      ];
    }

    if (minLevel) {
      where.minLevel = { gte: this.skillLevelOrder(minLevel) };
    }

    if (maxLevel) {
      where.maxLevel = { lte: this.skillLevelOrder(maxLevel) };
    }

    if (date) {
      where.date = new Date(date);
    }

    if (status) {
      where.status = status;
    } else {
      where.status = MatchStatus.LOOKING_FOR_PLAYERS;
    }

    const [matches, total] = await Promise.all([
      this.prisma.match.findMany({
        where,
        include: {
          players: { include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, skillLevel: true } } } },
          court: { include: { club: { select: { id: true, name: true, city: true } } } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      }),
      this.prisma.match.count({ where }),
    ]);

    return {
      data: matches,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const match = await this.prisma.match.findUnique({
      where: { id },
      include: {
        players: { include: { user: true } },
        court: { include: { club: true } },
        booking: true,
        invites: true,
      },
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    return match;
  }

  async findMyMatches(userId: string, upcoming: boolean = true) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const where: any = {
      players: { some: { userId } },
    };

    if (upcoming) {
      where.date = { gte: today };
      where.status = { in: [MatchStatus.LOOKING_FOR_PLAYERS, MatchStatus.FULL, MatchStatus.IN_PROGRESS] };
    }

    return this.prisma.match.findMany({
      where,
      include: {
        players: { include: { user: true } },
        court: { include: { club: true } },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });
  }

  async join(id: string, dto: JoinMatchDto, userId: string) {
    const match = await this.findOne(id);

    if (match.status !== MatchStatus.LOOKING_FOR_PLAYERS) {
      throw new BadRequestException('Match is no longer accepting players');
    }

    const existingPlayer = match.players.find((p) => p.userId === userId);
    if (existingPlayer) {
      throw new BadRequestException('You are already in this match');
    }

    if (match.players.length >= match.playersNeeded) {
      throw new BadRequestException('Match is already full');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      const userLevel = this.skillLevelOrder(user.skillLevel);
      const minLevel = this.skillLevelOrder(match.minLevel);
      const maxLevel = this.skillLevelOrder(match.maxLevel);

      if (userLevel < minLevel || userLevel > maxLevel) {
        throw new BadRequestException('Your skill level does not match the requirements');
      }
    }

    const player = await this.prisma.matchPlayer.create({
      data: {
        matchId: id,
        userId,
        team: dto.team || 0,
        position: dto.position,
        confirmedAt: new Date(),
      },
    });

    const updatedMatch = await this.prisma.match.findUnique({
      where: { id },
      include: { players: true },
    });

    if (updatedMatch && updatedMatch.players.length >= match.playersNeeded) {
      await this.prisma.match.update({
        where: { id },
        data: { status: MatchStatus.FULL },
      });
    }

    return this.findOne(id);
  }

  async leave(id: string, userId: string) {
    const match = await this.findOne(id);

    const player = match.players.find((p) => p.userId === userId);
    if (!player) {
      throw new BadRequestException('You are not in this match');
    }

    if (player.isOrganizer) {
      throw new BadRequestException('Organizer cannot leave the match');
    }

    await this.prisma.matchPlayer.delete({
      where: { id: player.id },
    });

    if (match.status === MatchStatus.FULL) {
      await this.prisma.match.update({
        where: { id },
        data: { status: MatchStatus.LOOKING_FOR_PLAYERS },
      });
    }

    return this.findOne(id);
  }

  async invitePlayer(id: string, dto: InviteToMatchDto, userId: string) {
    const match = await this.findOne(id);

    const organizer = match.players.find((p) => p.isOrganizer);
    if (organizer?.userId !== userId) {
      throw new ForbiddenException('Only the organizer can invite players');
    }

    const invite = await this.prisma.matchInvite.create({
      data: {
        matchId: id,
        email: dto.email,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const inviter = await this.prisma.user.findUnique({ where: { id: userId } });

    await this.emailService.sendMatchInviteEmail(
      dto.email,
      inviter?.firstName || 'Um jogador',
      {
        date: match.date.toLocaleDateString('pt-PT'),
        time: match.startTime,
        location: match.court?.club?.name || match.location || 'A definir',
        level: `${match.minLevel} - ${match.maxLevel}`,
      },
      invite.token,
    );

    return invite;
  }

  async recordScore(id: string, dto: RecordScoreDto, userId: string) {
    const match = await this.findOne(id);

    const organizer = match.players.find((p) => p.isOrganizer);
    if (organizer?.userId !== userId) {
      throw new ForbiddenException('Only the organizer can record the score');
    }

    return this.prisma.match.update({
      where: { id },
      data: {
        score: dto.score,
        winnerId: dto.winnerId,
        status: MatchStatus.COMPLETED,
      },
      include: { players: { include: { user: true } } },
    });
  }

  async cancel(id: string, userId: string) {
    const match = await this.findOne(id);

    const organizer = match.players.find((p) => p.isOrganizer);
    if (organizer?.userId !== userId) {
      throw new ForbiddenException('Only the organizer can cancel the match');
    }

    return this.prisma.match.update({
      where: { id },
      data: { status: MatchStatus.CANCELLED },
    });
  }

  private skillLevelOrder(level: SkillLevel): number {
    const order = {
      [SkillLevel.BEGINNER]: 1,
      [SkillLevel.INTERMEDIATE]: 2,
      [SkillLevel.ADVANCED]: 3,
      [SkillLevel.PROFESSIONAL]: 4,
    };
    return order[level] || 0;
  }
}
