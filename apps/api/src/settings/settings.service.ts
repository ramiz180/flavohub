import { Injectable } from '@nestjs/common';
import { PlatformSettings } from '@prisma/client';
import { AuditLogService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async get(): Promise<PlatformSettings> {
    return this.prisma.platformSettings.upsert({
      where: { id: 'default' },
      update: {},
      create: { id: 'default' },
    });
  }

  async update(dto: UpdateSettingsDto, actorId: string): Promise<PlatformSettings> {
    const before = await this.get();

    const settings = await this.prisma.platformSettings.update({
      where: { id: 'default' },
      data: dto,
    });

    await this.auditLog.log({
      actorId,
      action: 'UPDATE',
      entityType: 'PlatformSettings',
      entityId: 'default',
      before: { ...before },
      after: { ...settings },
    });

    return settings;
  }
}
