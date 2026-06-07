import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Coupon, Prisma } from '@prisma/client';
import { AuditLogService } from '../audit/audit.service';
import { ListResult } from '../common/list-result';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { ListCouponsQueryDto } from './dto/list-coupons-query.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';

@Injectable()
export class CouponsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async create(dto: CreateCouponDto, actorId: string): Promise<Coupon> {
    const code = dto.code.toUpperCase();
    const existing = await this.prisma.coupon.findUnique({ where: { code } });
    if (existing) throw new ConflictException(`Coupon code ${code} already exists`);

    const coupon = await this.prisma.coupon.create({
      data: {
        ...dto,
        code,
        minOrderValue: dto.minOrderValue ?? 0,
        isActive: dto.isActive ?? true,
      },
    });

    await this.auditLog.log({
      actorId,
      action: 'CREATE',
      entityType: 'Coupon',
      entityId: coupon.id,
      after: this.snap(coupon),
    });

    return coupon;
  }

  async findAll(query: ListCouponsQueryDto): Promise<ListResult<Coupon>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Prisma.CouponWhereInput = {
      ...(query.isActive !== undefined && { isActive: query.isActive }),
      ...(query.search !== undefined && {
        code: { contains: query.search.toUpperCase(), mode: 'insensitive' },
      }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.coupon.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.coupon.count({ where }),
    ]);

    return new ListResult(items, total, page, pageSize);
  }

  async findOne(id: string): Promise<Coupon> {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon not found');
    return coupon;
  }

  async update(id: string, dto: UpdateCouponDto, actorId: string): Promise<Coupon> {
    const before = await this.findOne(id);

    if (dto.code !== undefined) {
      const code = dto.code.toUpperCase();
      const conflict = await this.prisma.coupon.findFirst({
        where: { code, NOT: { id } },
      });
      if (conflict) throw new ConflictException(`Coupon code ${code} already exists`);
      dto = { ...dto, code };
    }

    const coupon = await this.prisma.coupon.update({ where: { id }, data: dto });

    await this.auditLog.log({
      actorId,
      action: 'UPDATE',
      entityType: 'Coupon',
      entityId: id,
      before: this.snap(before),
      after: this.snap(coupon),
    });

    return coupon;
  }

  private snap(c: Coupon): Record<string, unknown> {
    return { id: c.id, code: c.code, type: c.type, isActive: c.isActive, usedCount: c.usedCount };
  }
}
