import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import * as Joi from 'joi';

import { TransformInterceptor } from './common/interceptors/transform.interceptor';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ClubsModule } from './clubs/clubs.module';
import { CourtsModule } from './courts/courts.module';
import { BookingsModule } from './bookings/bookings.module';
import { MatchesModule } from './matches/matches.module';
import { TournamentsModule } from './tournaments/tournaments.module';
import { RankingsModule } from './rankings/rankings.module';
import { ChatModule } from './chat/chat.module';
import { NotificationsModule } from './notifications/notifications.module';
import { FriendsModule } from './friends/friends.module';
import { EmailModule } from './email/email.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
        PORT: Joi.number().default(3000),
        DATABASE_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().required(),
        JWT_EXPIRES_IN: Joi.number().default(900),
        JWT_REFRESH_SECRET: Joi.string().required(),
        JWT_REFRESH_EXPIRES_IN: Joi.number().default(604800),
        RATE_LIMIT_TTL: Joi.number().default(60),
        RATE_LIMIT_MAX: Joi.number().default(100),
      }),
    }),
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.RATE_LIMIT_TTL || '60000'),
        limit: parseInt(process.env.RATE_LIMIT_MAX || '100'),
      },
    ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    ClubsModule,
    CourtsModule,
    BookingsModule,
    MatchesModule,
    TournamentsModule,
    RankingsModule,
    ChatModule,
    NotificationsModule,
    FriendsModule,
    EmailModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
})
export class AppModule {}
