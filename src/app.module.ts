import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { buildTypeOrmOptions } from './config/data-source';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AdminAuthModule } from './admin-auth/admin-auth.module';
import { UsersModule } from './users/users.module';
import { CategoriesModule } from './categories/categories.module';
import { VerificationsModule } from './verifications/verifications.module';
import { ReviewsModule } from './reviews/reviews.module';
import { AdminModule } from './admin/admin.module';
import { StorageModule } from './storage/storage.module';
import { PhotosModule } from './photos/photos.module';
import { ProvidersModule } from './providers/providers.module';
import { SupabaseModule } from './supabase/supabase.module';
import { Msg91Module } from './msg91/msg91.module';
import { OtpModule } from './otp/otp.module';
import { GeocodeModule } from './geocode/geocode.module';
import { SavedLocationsModule } from './saved-locations/saved-locations.module';
import { HomeModule } from './home/home.module';
import { ProductsModule } from './products/products.module';
import { SavedItemsModule } from './saved-items/saved-items.module';
import { ChatModule } from './chat/chat.module';
import { SearchModule } from './search/search.module';
import { ExploreModule } from './explore/explore.module';
import { InviteModule } from './invite/invite.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { HealthModule } from './health/health.module';
import { ReportsModule } from './reports/reports.module';
import { NotificationsModule } from './notifications/notifications.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { ContentSanitizerModule } from './common/content-sanitizer';
import { BugReportsModule } from './bug-reports/bug-reports.module';
import { PaymentModule } from './payment/payment.module';
import { VoucherModule } from './voucher/voucher.module';
import { ServiceableCitiesModule } from './serviceable-cities/serviceable-cities.module';
import { SystemSetting } from './entities';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ...buildTypeOrmOptions(config.get<string>('DATABASE_URL')),
        logging: config.get('NODE_ENV') === 'development' ? ['error'] : false,
      }),
    }),

    // Rate limiting — 300 requests per minute globally (per IP)
    // Sensitive endpoints (auth, become-provider) have tighter per-route limits.
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 300 }]),

    // In-memory cache with 5-minute default TTL
    CacheModule.register({ isGlobal: true, ttl: 300000 }),

    // Scheduled tasks (materialized view refresh, etc.)
    ScheduleModule.forRoot(),

    StorageModule,
    PhotosModule,
    Msg91Module,
    OtpModule,
    SupabaseModule,
    AuthModule,
    AdminAuthModule,
    UsersModule,
    CategoriesModule,
    VerificationsModule,
    ReviewsModule,
    AdminModule,
    ProvidersModule,
    GeocodeModule,
    SavedLocationsModule,
    HomeModule,
    ProductsModule,
    SavedItemsModule,
    ChatModule,
    SearchModule,
    ExploreModule,
    InviteModule,
    AnalyticsModule,
    HealthModule,
    ReportsModule,
    NotificationsModule,
    ContentSanitizerModule,
    BugReportsModule,
    PaymentModule,
    VoucherModule,
    ServiceableCitiesModule,
    TypeOrmModule.forFeature([SystemSetting]),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global JWT auth guard — all endpoints require auth unless marked @Public()
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Global rate limiter guard
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
