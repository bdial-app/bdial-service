import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
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
import { GeocodeModule } from './geocode/geocode.module';
import { SavedLocationsModule } from './saved-locations/saved-locations.module';
import { HomeModule } from './home/home.module';
import { ProductsModule } from './products/products.module';
import { SavedItemsModule } from './saved-items/saved-items.module';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ...buildTypeOrmOptions(config.getOrThrow<string>('DATABASE_URL')),
        logging: config.get('NODE_ENV') === 'development' ? ['error'] : false,
      }),
    }),
    StorageModule,
    PhotosModule,
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
