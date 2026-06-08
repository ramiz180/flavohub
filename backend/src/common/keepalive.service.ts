import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class KeepaliveService {
  private readonly logger = new Logger(KeepaliveService.name);
  private readonly appUrl = process.env['APP_URL'] ?? 'http://localhost:3000';

  @Cron('0 */14 * * * *')
  async ping(): Promise<void> {
    if (process.env['NODE_ENV'] !== 'production') return;
    try {
      const res = await fetch(`${this.appUrl}/health`);
      this.logger.debug(`Keepalive ping: ${res.status}`);
    } catch (err) {
      this.logger.debug(
        `Keepalive ping: failed (${err instanceof Error ? err.message : 'unknown'})`,
      );
    }
  }
}
