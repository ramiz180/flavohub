import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService) {}

  get nodeEnv(): string {
    return this.configService.getOrThrow<string>('NODE_ENV');
  }

  get port(): number {
    return this.configService.get<number>('API_PORT') ?? 3000;
  }

  get databaseUrl(): string | undefined {
    return this.configService.get<string>('DATABASE_URL');
  }

  get jwtAccessSecret(): string {
    return this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');
  }

  get jwtAccessTtl(): string {
    return this.configService.getOrThrow<string>('JWT_ACCESS_TTL');
  }

  get jwtRefreshSecret(): string {
    return this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');
  }

  get jwtRefreshTtl(): string {
    return this.configService.getOrThrow<string>('JWT_REFRESH_TTL');
  }

  get cloudinaryCloudName(): string | undefined {
    return this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
  }

  get cloudinaryApiKey(): string | undefined {
    return this.configService.get<string>('CLOUDINARY_API_KEY');
  }

  get cloudinaryApiSecret(): string | undefined {
    return this.configService.get<string>('CLOUDINARY_API_SECRET');
  }

  get redisUrl(): string {
    return this.configService.getOrThrow<string>('REDIS_URL');
  }

  get shadowfaxEnv(): 'test' | 'production' {
    return this.configService.getOrThrow<'test' | 'production'>('SHADOWFAX_ENV');
  }

  get shadowfaxApiKey(): string | undefined {
    return this.configService.get<string>('SHADOWFAX_API_KEY');
  }

  get borzoEnv(): 'test' | 'production' {
    return this.configService.getOrThrow<'test' | 'production'>('BORZO_ENV');
  }

  get borzoApiToken(): string | undefined {
    return this.configService.get<string>('BORZO_API_TOKEN');
  }

  get gpsPollIntervalMs(): number {
    return this.configService.getOrThrow<number>('GPS_POLL_INTERVAL_MS');
  }

  get googleMapsServerApiKey(): string | undefined {
    return this.configService.get<string>('GOOGLE_MAPS_SERVER_API_KEY');
  }

  get googlePlacesApiKey(): string | undefined {
    return this.configService.get<string>('GOOGLE_PLACES_API_KEY');
  }

  get googleGeocodingApiKey(): string | undefined {
    return this.configService.get<string>('GOOGLE_GEOCODING_API_KEY') || this.configService.get<string>('GOOGLE_MAPS_API_KEY');
  }

  get googleDirectionsApiKey(): string | undefined {
    return this.configService.get<string>('GOOGLE_DIRECTIONS_API_KEY');
  }

  get googleDistanceMatrixApiKey(): string | undefined {
    return this.configService.get<string>('GOOGLE_DISTANCE_MATRIX_API_KEY') || this.configService.get<string>('GOOGLE_MAPS_API_KEY');
  }
}
