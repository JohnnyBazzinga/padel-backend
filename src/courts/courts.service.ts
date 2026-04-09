import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourtDto, UpdateCourtDto, GetAvailabilityDto } from './dto';

@Injectable()
export class CourtsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCourtDto, userId: string, userRoles: string[]) {
    const club = await this.prisma.club.findUnique({
      where: { id: dto.clubId },
    });

    if (!club) {
      throw new NotFoundException('Club not found');
    }

    if (club.ownerId !== userId && !userRoles.includes('ADMIN')) {
      throw new ForbiddenException('Not authorized to add courts to this club');
    }

    return this.prisma.court.create({
      data: dto,
      include: { club: true },
    });
  }

  async findByClub(clubId: string) {
    return this.prisma.court.findMany({
      where: { clubId, isActive: true },
      orderBy: { courtNumber: 'asc' },
    });
  }

  async findOne(id: string) {
    const court = await this.prisma.court.findUnique({
      where: { id },
      include: { club: true },
    });

    if (!court) {
      throw new NotFoundException('Court not found');
    }

    return court;
  }

  async update(id: string, dto: UpdateCourtDto, userId: string, userRoles: string[]) {
    const court = await this.prisma.court.findUnique({
      where: { id },
      include: { club: true },
    });

    if (!court) {
      throw new NotFoundException('Court not found');
    }

    if (court.club.ownerId !== userId && !userRoles.includes('ADMIN')) {
      throw new ForbiddenException('Not authorized to update this court');
    }

    return this.prisma.court.update({
      where: { id },
      data: dto,
    });
  }

  async getAvailability(courtId: string, dto: GetAvailabilityDto) {
    const court = await this.findOne(courtId);

    const bookings = await this.prisma.booking.findMany({
      where: {
        courtId,
        date: new Date(dto.date),
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
      select: {
        startTime: true,
        endTime: true,
        status: true,
      },
      orderBy: { startTime: 'asc' },
    });

    const timeSlots = this.generateTimeSlots(dto.date);

    const availability = timeSlots.map((slot) => {
      const isBooked = bookings.some((booking) => {
        const bookingStart = this.timeToMinutes(booking.startTime);
        const bookingEnd = this.timeToMinutes(booking.endTime);
        const slotStart = this.timeToMinutes(slot.startTime);
        const slotEnd = this.timeToMinutes(slot.endTime);
        return slotStart < bookingEnd && slotEnd > bookingStart;
      });

      const isPeak = this.isPeakHour(slot.startTime, court.peakHoursStart, court.peakHoursEnd);
      const price = isPeak && court.pricePerHourPeak ? court.pricePerHourPeak : court.pricePerHour;

      return {
        ...slot,
        available: !isBooked && !court.isUnderMaintenance,
        price,
        isPeak,
      };
    });

    return {
      court,
      date: dto.date,
      availability,
    };
  }

  async getClubAvailability(clubId: string, date: string) {
    const courts = await this.prisma.court.findMany({
      where: { clubId, isActive: true },
      orderBy: { courtNumber: 'asc' },
    });

    const results = await Promise.all(
      courts.map(async (court) => {
        const availability = await this.getAvailability(court.id, { date });
        return {
          court,
          availability: availability.availability,
        };
      }),
    );

    return {
      date,
      courts: results,
    };
  }

  private generateTimeSlots(dateString: string) {
    const slots = [];
    const startHour = 7;
    const endHour = 23;
    const duration = 90;

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const startMinutes = hour * 60 + minute;
        const endMinutes = startMinutes + duration;

        if (endMinutes <= endHour * 60) {
          slots.push({
            startTime: this.minutesToTime(startMinutes),
            endTime: this.minutesToTime(endMinutes),
          });
        }
      }
    }

    return slots;
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  private isPeakHour(time: string, peakStart?: string, peakEnd?: string): boolean {
    if (!peakStart || !peakEnd) return false;
    const current = this.timeToMinutes(time);
    const start = this.timeToMinutes(peakStart);
    const end = this.timeToMinutes(peakEnd);
    return current >= start && current < end;
  }
}
