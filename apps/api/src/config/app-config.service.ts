import { Injectable } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService) {}

  get nodeEnv(): string {
    return this.configService.getOrThrow<string>('NODE_ENV');
  }

  get port(): number {
    return this.configService.getOrThrow<number>('API_PORT');
  }

  get databaseUrl(): string | undefined {
    return this.configService.get<string>('DATABASE_URL');
  }

  get jwtAccessSecret(): string | undefined {
    return this.configService.get<string>('JWT_ACCESS_SECRET');
  }

  get jwtAccessTtl(): string | undefined {
    return this.configService.get<string>('JWT_ACCESS_TTL');
  }

  get jwtRefreshSecret(): string | undefined {
    return this.configService.get<string>('JWT_REFRESH_SECRET');
  }

  get jwtRefreshTtl(): string | undefined {
    return this.configService.get<string>('JWT_REFRESH_TTL');
  }
}
