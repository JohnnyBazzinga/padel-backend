import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CreateBookingDto, UpdateBookingDto, ListBookingsDto } from './dto';
import { BookingStatus } from '@prisma/client';

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  async create(dto: CreateBookingDto, userId: string) {
    const court = await this.prisma.court.findUnique({
      where: { id: dto.courtId },
      include: { club: true },
    });

    if (!court) {
      throw new NotFoundException('Court not found');
    }

    if (!court.isActive || court.isUnderMaintenance) {
      throw new BadRequestException('Court is not available');
    }

    const existingBooking = await this.prisma.booking.findFirst({
      where: {
        courtId: dto.courtId,
        date: new Date(dto.date),
        status: { in: ['PENDING', 'CONFIRMED'] },
        OR: [
          {
            AND: [
              { startTime: { lte: dto.startTime } },
              { endTime: { gt: dto.startTime } },
            ],
          },
          {
            AND: [
              { startTime: { lt: dto.endTime } },
              { endTime: { gte: dto.endTime } },
            ],
          },
          {
            AND: [
              { startTime: { gte: dto.startTime } },
              { endTime: { lte: dto.endTime } },
            ],
          },
        ],
      },
    });

    if (existingBooking) {
      throw new BadRequestException('Time slot is already booked');
    }

    const isPeak = this.isPeakHour(dto.startTime, court.peakHoursStart, court.peakHoursEnd);
    const pricePerHour = isPeak && court.pricePerHourPeak ? court.pricePerHourPeak : court.pricePerHour;
    const durationMins = dto.durationMins || 90;
    const totalPrice = Math.round((pricePerHour / 60) * durationMins);

    const endTime = dto.endTime || this.calculateEndTime(dto.startTime, durationMins);

    const booking = await this.prisma.booking.create({
      data: {
        courtId: dto.courtId,
        userId,
        date: new Date(dto.date),
        startTime: dto.startTime,
        endTime,
        durationMins,
        totalPrice,
        notes: dto.notes,
        status: BookingStatus.CONFIRMED,
      },
      include: {
        court: { include: { club: true } },
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (user) {
      await this.emailService.sendBookingConfirmationEmail(
        user.email,
        user.firstName || 'Jogador',
        {
          clubName: court.club.name,
          courtName: court.name,
          date: new Date(dto.date).toLocaleDateString('pt-PT'),
          startTime: dto.startTime,
          endTime,
          price: `${(totalPrice / 100).toFixed(2)}€`,
        },
      );
    }

    return booking;
  }

  async findAll(dto: ListBookingsDto, userId: string, userRoles: string[]) {
    const { status, courtId, clubId, date, page = 1, limit = 20 } = dto;

    const where: any = {};

    if (!userRoles.includes('ADMIN') && !userRoles.includes('CLUB_OWNER')) {
      where.userId = userId;
    }

    if (status) {
      where.status = status;
    }

    if (courtId) {
      where.courtId = courtId;
    }

    if (clubId) {
      where.court = { clubId };
    }

    if (date) {
      where.date = new Date(date);
    }

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: {
          court: { include: { club: true } },
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ date: 'desc' }, { startTime: 'desc' }],
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      data: bookings,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findMyBookings(userId: string, upcoming: boolean = true) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const where: any = {
      userId,
      status: { in: ['PENDING', 'CONFIRMED'] },
    };

    if (upcoming) {
      where.date = { gte: today };
    }

    return this.prisma.booking.findMany({
      where,
      include: {
        court: { include: { club: true } },
        match: { include: { players: { include: { user: true } } } },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });
  }

  async findOne(id: string, userId: string, userRoles: string[]) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        court: { include: { club: true } },
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        match: { include: { players: { include: { user: true } } } },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (
      booking.userId !== userId &&
      !userRoles.includes('ADMIN') &&
      booking.court.club.ownerId !== userId
    ) {
      throw new ForbiddenException('Not authorized to view this booking');
    }

    return booking;
  }

  async cancel(id: string, userId: string, reason?: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { court: { include: { club: true } } },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.userId !== userId && booking.court.club.ownerId !== userId) {
      throw new ForbiddenException('Not authorized to cancel this booking');
    }

    if (booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel this booking');
    }

    return this.prisma.booking.update({
      where: { id },
      data: {
        status: BookingStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelledBy: userId,
        cancelReason: reason,
      },
      include: { court: { include: { club: true } } },
    });
  }

  private isPeakHour(time: string, peakStart?: string | null, peakEnd?: string | null): boolean {
    if (!peakStart || !peakEnd) return false;
    const [h, m] = time.split(':').map(Number);
    const current = h * 60 + m;
    const [sh, sm] = peakStart.split(':').map(Number);
    const start = sh * 60 + sm;
    const [eh, em] = peakEnd.split(':').map(Number);
    const end = eh * 60 + em;
    return current >= start && current < end;
  }

  private calculateEndTime(startTime: string, durationMins: number): string {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationMins;
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  }
}
