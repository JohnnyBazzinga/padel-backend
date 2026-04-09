import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClubDto, UpdateClubDto, SearchClubsDto } from './dto';

@Injectable()
export class ClubsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateClubDto, ownerId: string) {
    const slug = this.generateSlug(dto.name);

    return this.prisma.club.create({
      data: {
        ...dto,
        slug,
        ownerId,
        businessHours: dto.businessHours ? JSON.stringify(dto.businessHours) : null,
      },
      include: {
        courts: true,
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  async findAll(dto: SearchClubsDto) {
    const { query, city, hasParking, hasShowers, page = 1, limit = 20 } = dto;

    const where: any = { isActive: true };

    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ];
    }

    if (city) {
      where.city = { contains: city, mode: 'insensitive' };
    }

    if (hasParking !== undefined) {
      where.hasParking = hasParking;
    }

    if (hasShowers !== undefined) {
      where.hasShowers = hasShowers;
    }

    const [clubs, total] = await Promise.all([
      this.prisma.club.findMany({
        where,
        include: {
          courts: { where: { isActive: true } },
          _count: { select: { courts: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.club.count({ where }),
    ]);

    return {
      data: clubs.map((club) => ({
        ...club,
        businessHours: club.businessHours ? JSON.parse(club.businessHours) : null,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const club = await this.prisma.club.findUnique({
      where: { id },
      include: {
        courts: { where: { isActive: true }, orderBy: { courtNumber: 'asc' } },
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        _count: { select: { courts: true, tournaments: true } },
      },
    });

    if (!club) {
      throw new NotFoundException('Club not found');
    }

    return {
      ...club,
      businessHours: club.businessHours ? JSON.parse(club.businessHours) : null,
    };
  }

  async findBySlug(slug: string) {
    const club = await this.prisma.club.findUnique({
      where: { slug },
      include: {
        courts: { where: { isActive: true }, orderBy: { courtNumber: 'asc' } },
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!club) {
      throw new NotFoundException('Club not found');
    }

    return {
      ...club,
      businessHours: club.businessHours ? JSON.parse(club.businessHours) : null,
    };
  }

  async update(id: string, dto: UpdateClubDto, userId: string, userRoles: string[]) {
    const club = await this.findOne(id);

    if (club.ownerId !== userId && !userRoles.includes('ADMIN')) {
      throw new ForbiddenException('Not authorized to update this club');
    }

    return this.prisma.club.update({
      where: { id },
      data: {
        ...dto,
        businessHours: dto.businessHours ? JSON.stringify(dto.businessHours) : undefined,
      },
      include: { courts: true },
    });
  }

  async getMyClubs(userId: string) {
    return this.prisma.club.findMany({
      where: { ownerId: userId },
      include: {
        courts: true,
        _count: { select: { courts: true, tournaments: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getNearbyClubs(latitude: number, longitude: number, radiusKm: number = 10) {
    const clubs = await this.prisma.club.findMany({
      where: {
        isActive: true,
        latitude: { not: null },
        longitude: { not: null },
      },
      include: {
        courts: { where: { isActive: true } },
      },
    });

    return clubs
      .map((club) => ({
        ...club,
        distance: this.calculateDistance(latitude, longitude, club.latitude!, club.longitude!),
        businessHours: club.businessHours ? JSON.parse(club.businessHours) : null,
      }))
      .filter((club) => club.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
