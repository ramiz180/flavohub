import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Restaurant, RestaurantStatus, Role as PrismaRole } from '@prisma/client';
import { hash } from 'argon2';
import { Role } from '@flavohub/shared';
import { AuditLogService } from '../audit/audit.service';
import { ListResult } from '../common/list-result';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { ListRestaurantsQueryDto } from './dto/list-restaurants-query.dto';
import { RejectRestaurantDto } from './dto/reject-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { AssignOwnerDto } from './dto/assign-owner.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

export type SafeOwner = { id: string; email: string; fullName: string };

@Injectable()
export class RestaurantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async create(dto: CreateRestaurantDto, actorId: string): Promise<Restaurant> {
    const restaurant = await this.prisma.restaurant.create({ data: dto });
    await this.auditLog.log({
      actorId,
      action: 'CREATE',
      entityType: 'Restaurant',
      entityId: restaurant.id,
      after: this.snap(restaurant),
    });
    return restaurant;
  }

  async findAll(query: ListRestaurantsQueryDto): Promise<ListResult<Restaurant>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Prisma.RestaurantWhereInput = {
      ...(query.status !== undefined && { status: query.status }),
      ...(query.isActive !== undefined && { isActive: query.isActive }),
      ...(query.search !== undefined && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { city: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.restaurant.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.restaurant.count({ where }),
    ]);

    return new ListResult(items, total, page, pageSize);
  }

  async findOne(id: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
      include: {
        hours: { orderBy: { dayOfWeek: 'asc' } },
        owner: { select: { id: true, email: true, fullName: true } },
      },
    });
    if (!restaurant) throw new NotFoundException('Restaurant not found');
    return restaurant;
  }

  async assignOwner(
    restaurantId: string,
    dto: AssignOwnerDto,
    actorId: string,
  ): Promise<SafeOwner> {
    const restaurant = await this.prisma.restaurant.findUnique({ where: { id: restaurantId } });
    if (!restaurant) throw new NotFoundException('Restaurant not found');
    if (restaurant.ownerId) throw new ConflictException('Restaurant already has an owner');

    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email is already in use');

    const passwordHash = await hash(dto.password);

    const owner = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          fullName: dto.fullName,
          role: Role.RESTAURANT_OWNER as unknown as PrismaRole,
        },
        select: { id: true, email: true, fullName: true },
      });
      await tx.restaurant.update({ where: { id: restaurantId }, data: { ownerId: created.id } });
      return created;
    });

    await this.auditLog.log({
      actorId,
      action: 'ASSIGN_OWNER',
      entityType: 'Restaurant',
      entityId: restaurantId,
      after: { ownerId: owner.id, ownerEmail: owner.email },
    });

    return owner;
  }

  async update(id: string, dto: UpdateRestaurantDto, actorId: string): Promise<Restaurant> {
    const before = await this.findOrThrow(id);
    const restaurant = await this.prisma.restaurant.update({ where: { id }, data: dto });
    await this.auditLog.log({
      actorId,
      action: 'UPDATE',
      entityType: 'Restaurant',
      entityId: id,
      before: this.snap(before),
      after: this.snap(restaurant),
    });
    return restaurant;
  }

  async approve(id: string, actorId: string): Promise<Restaurant> {
    const restaurant = await this.findOrThrow(id);
    if (restaurant.status !== RestaurantStatus.PENDING) {
      throw new ConflictException(
        `Cannot approve restaurant with status ${restaurant.status}. Only PENDING restaurants can be approved.`,
      );
    }
    const updated = await this.prisma.restaurant.update({
      where: { id },
      data: { status: RestaurantStatus.APPROVED },
    });
    await this.auditLog.log({
      actorId,
      action: 'APPROVE',
      entityType: 'Restaurant',
      entityId: id,
      before: { status: restaurant.status },
      after: { status: updated.status },
    });
    return updated;
  }

  async reject(id: string, dto: RejectRestaurantDto, actorId: string): Promise<Restaurant> {
    const restaurant = await this.findOrThrow(id);
    if (restaurant.status !== RestaurantStatus.PENDING) {
      throw new ConflictException(
        `Cannot reject restaurant with status ${restaurant.status}. Only PENDING restaurants can be rejected.`,
      );
    }
    const updated = await this.prisma.restaurant.update({
      where: { id },
      data: { status: RestaurantStatus.REJECTED, rejectionReason: dto.reason },
    });
    await this.auditLog.log({
      actorId,
      action: 'REJECT',
      entityType: 'Restaurant',
      entityId: id,
      before: { status: restaurant.status },
      after: { status: updated.status, rejectionReason: updated.rejectionReason },
    });
    return updated;
  }

  async activate(id: string, actorId: string): Promise<Restaurant> {
    const restaurant = await this.findOrThrow(id);
    if (restaurant.status !== RestaurantStatus.APPROVED) {
      throw new ConflictException(
        `Cannot activate restaurant with status ${restaurant.status}. Restaurant must be APPROVED before activation.`,
      );
    }
    const updated = await this.prisma.restaurant.update({
      where: { id },
      data: { isActive: true },
    });
    await this.auditLog.log({
      actorId,
      action: 'ACTIVATE',
      entityType: 'Restaurant',
      entityId: id,
      before: { isActive: restaurant.isActive },
      after: { isActive: updated.isActive },
    });
    return updated;
  }

  async deactivate(id: string, actorId: string): Promise<Restaurant> {
    const restaurant = await this.findOrThrow(id);
    const updated = await this.prisma.restaurant.update({
      where: { id },
      data: { isActive: false },
    });
    await this.auditLog.log({
      actorId,
      action: 'DEACTIVATE',
      entityType: 'Restaurant',
      entityId: id,
      before: { isActive: restaurant.isActive },
      after: { isActive: updated.isActive },
    });
    return updated;
  }

  async resetOwnerPassword(
    restaurantId: string,
    dto: ResetPasswordDto,
    actorId: string,
  ): Promise<{ message: string }> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { ownerId: true },
    });
    if (!restaurant) throw new NotFoundException('Restaurant not found');
    if (!restaurant.ownerId) throw new NotFoundException('No owner assigned to this restaurant');

    const passwordHash = await hash(dto.newPassword);
    await this.prisma.user.update({
      where: { id: restaurant.ownerId },
      data: { passwordHash },
    });

    await this.auditLog.log({
      actorId,
      action: 'RESET_PASSWORD',
      entityType: 'User',
      entityId: restaurant.ownerId,
      after: { performedBy: actorId },
    });

    return { message: 'Password reset successfully' };
  }

  private async findOrThrow(id: string): Promise<Restaurant> {
    const restaurant = await this.prisma.restaurant.findUnique({ where: { id } });
    if (!restaurant) throw new NotFoundException('Restaurant not found');
    return restaurant;
  }

  private snap(r: Restaurant): Record<string, unknown> {
    return { id: r.id, name: r.name, status: r.status, isActive: r.isActive, city: r.city };
  }
}
