import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditLogParams {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(params: AuditLogParams): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: params.actorId,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId ?? null,
          ...(params.before !== undefined && {
            before: params.before as Prisma.InputJsonValue,
          }),
          ...(params.after !== undefined && {
            after: params.after as Prisma.InputJsonValue,
          }),
        },
      });
    } catch (err) {
      this.logger.error('Failed to write audit log', String(err));
    }
  }
}
