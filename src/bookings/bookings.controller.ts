import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { BookingsService } from './bookings.service';
import { CreateBookingDto, ListBookingsDto, CancelBookingDto } from './dto';
import { CurrentUser, JwtPayload } from '../common/decorators';

@ApiTags('Bookings')
@ApiBearerAuth()
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a booking' })
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateBookingDto,
  ) {
    return this.bookingsService.create(dto, user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'List bookings' })
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query() dto: ListBookingsDto,
  ) {
    return this.bookingsService.findAll(dto, user.sub, user.roles);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get my upcoming bookings' })
  async findMyBookings(
    @CurrentUser() user: JwtPayload,
    @Query('upcoming') upcoming?: boolean,
  ) {
    return this.bookingsService.findMyBookings(user.sub, upcoming !== false);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get booking by ID' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.bookingsService.findOne(id, user.sub, user.roles);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel booking' })
  async cancel(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CancelBookingDto,
  ) {
    return this.bookingsService.cancel(id, user.sub, dto.reason);
  }
}
