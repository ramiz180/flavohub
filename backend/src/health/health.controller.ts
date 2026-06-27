import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthResponseDto } from './dto/health-response.dto';
import Redis from 'ioredis';
import { AppConfigService } from '../config/app-config.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  private redis: Redis;

  constructor(private config: AppConfigService) {
    this.redis = new Redis(this.config.redisUrl, {
      maxRetriesPerRequest: 1,
      retryStrategy: () => null, // Never retry on failure for health check
    });
    this.redis.on('error', () => {
      // Suppress connection errors for the health checker
    });
  }

  @Get()
  @ApiOperation({ summary: 'Health check' })
  @ApiOkResponse({ type: HealthResponseDto })
  async check(): Promise<HealthResponseDto & { redis: string }> {
    let redisStatus = 'down';
    try {
      if (this.redis.status === 'ready') {
        await this.redis.ping();
        redisStatus = 'up';
      }
    } catch {
      // ignore
    }

    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      redis: redisStatus,
    } as any;
  }
}
