import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTournamentDto, UpdateTournamentDto, SearchTournamentsDto, RegisterPlayerDto } from './dto';
import { TournamentStatus } from '@prisma/client';

@Injectable()
export class TournamentsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateTournamentDto, userId: string, userRoles: string[]) {
    const club = await this.prisma.club.findUnique({
      where: { id: dto.clubId },
    });

    if (!club) {
      throw new NotFoundException('Club not found');
    }

    if (club.ownerId !== userId && !userRoles.includes('ADMIN')) {
      throw new ForbiddenException('Not authorized to create tournaments for this club');
    }

    return this.prisma.tournament.create({
      data: {
        ...dto,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        registrationDeadline: new Date(dto.registrationDeadline),
      },
      include: { club: true },
    });
  }

  async findAll(dto: SearchTournamentsDto) {
    const { city, status, minLevel, maxLevel, page = 1, limit = 20 } = dto;

    const where: any = {};

    if (city) {
      where.club = { city: { contains: city, mode: 'insensitive' } };
    }

    if (status) {
      where.status = status;
    }

    if (minLevel) {
      where.minLevel = minLevel;
    }

    if (maxLevel) {
      where.maxLevel = maxLevel;
    }

    const [tournaments, total] = await Promise.all([
      this.prisma.tournament.findMany({
        where,
        include: {
          club: { select: { id: true, name: true, city: true, logoUrl: true } },
          _count: { select: { players: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { startDate: 'asc' },
      }),
      this.prisma.tournament.count({ where }),
    ]);

    return {
      data: tournaments,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id },
      include: {
        club: true,
        players: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, skillLevel: true } },
          },
          orderBy: { seed: 'asc' },
        },
        brackets: { orderBy: [{ round: 'asc' }, { matchNumber: 'asc' }] },
      },
    });

    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    return tournament;
  }

  async update(id: string, dto: UpdateTournamentDto, userId: string, userRoles: string[]) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id },
      include: { club: true },
    });

    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    if (tournament.club.ownerId !== userId && !userRoles.includes('ADMIN')) {
      throw new ForbiddenException('Not authorized to update this tournament');
    }

    return this.prisma.tournament.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        registrationDeadline: dto.registrationDeadline ? new Date(dto.registrationDeadline) : undefined,
      },
      include: { club: true },
    });
  }

  async register(id: string, dto: RegisterPlayerDto, userId: string) {
    const tournament = await this.findOne(id);

    if (tournament.status !== TournamentStatus.REGISTRATION_OPEN) {
      throw new BadRequestException('Registration is not open');
    }

    if (new Date() > tournament.registrationDeadline) {
      throw new BadRequestException('Registration deadline has passed');
    }

    if (tournament.players.length >= tournament.maxTeams) {
      throw new BadRequestException('Tournament is full');
    }

    const existingPlayer = tournament.players.find((p) => p.userId === userId);
    if (existingPlayer) {
      throw new BadRequestException('You are already registered');
    }

    return this.prisma.tournamentPlayer.create({
      data: {
        tournamentId: id,
        userId,
        partnerId: dto.partnerId,
        teamName: dto.teamName,
      },
      include: { user: true },
    });
  }

  async unregister(id: string, userId: string) {
    const tournament = await this.findOne(id);

    if (tournament.status !== TournamentStatus.REGISTRATION_OPEN) {
      throw new BadRequestException('Cannot unregister after registration closes');
    }

    const player = tournament.players.find((p) => p.userId === userId);
    if (!player) {
      throw new BadRequestException('You are not registered');
    }

    await this.prisma.tournamentPlayer.delete({
      where: { id: player.id },
    });

    return { message: 'Successfully unregistered' };
  }

  async generateBrackets(id: string, userId: string, userRoles: string[]) {
    const tournament = await this.findOne(id);

    if (tournament.club.ownerId !== userId && !userRoles.includes('ADMIN')) {
      throw new ForbiddenException('Not authorized');
    }

    if (tournament.brackets.length > 0) {
      throw new BadRequestException('Brackets already generated');
    }

    const players = tournament.players;
    const numTeams = players.length;

    if (numTeams < 2) {
      throw new BadRequestException('Not enough players');
    }

    const rounds = Math.ceil(Math.log2(numTeams));
    const brackets = [];

    for (let round = 1; round <= rounds; round++) {
      const matchesInRound = Math.pow(2, rounds - round);
      for (let matchNumber = 1; matchNumber <= matchesInRound; matchNumber++) {
        let team1Id = null;
        let team2Id = null;

        if (round === 1) {
          const idx1 = (matchNumber - 1) * 2;
          const idx2 = idx1 + 1;
          team1Id = players[idx1]?.id || null;
          team2Id = players[idx2]?.id || null;
        }

        brackets.push({
          tournamentId: id,
          round,
          matchNumber,
          team1Id,
          team2Id,
        });
      }
    }

    await this.prisma.tournamentBracket.createMany({
      data: brackets,
    });

    await this.prisma.tournament.update({
      where: { id },
      data: { status: TournamentStatus.IN_PROGRESS },
    });

    return this.findOne(id);
  }

  async updateBracketResult(id: string, bracketId: string, winnerId: string, score: string, userId: string, userRoles: string[]) {
    const tournament = await this.findOne(id);

    if (tournament.club.ownerId !== userId && !userRoles.includes('ADMIN')) {
      throw new ForbiddenException('Not authorized');
    }

    const bracket = await this.prisma.tournamentBracket.findUnique({
      where: { id: bracketId },
    });

    if (!bracket || bracket.tournamentId !== id) {
      throw new NotFoundException('Bracket not found');
    }

    const updated = await this.prisma.tournamentBracket.update({
      where: { id: bracketId },
      data: {
        winnerId,
        score,
        completedAt: new Date(),
      },
    });

    const nextRound = bracket.round + 1;
    const nextMatchNumber = Math.ceil(bracket.matchNumber / 2);

    const nextBracket = await this.prisma.tournamentBracket.findFirst({
      where: {
        tournamentId: id,
        round: nextRound,
        matchNumber: nextMatchNumber,
      },
    });

    if (nextBracket) {
      const isTeam1 = bracket.matchNumber % 2 === 1;
      await this.prisma.tournamentBracket.update({
        where: { id: nextBracket.id },
        data: isTeam1 ? { team1Id: winnerId } : { team2Id: winnerId },
      });
    }

    return this.findOne(id);
  }
}
