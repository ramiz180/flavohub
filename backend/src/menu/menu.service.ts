import { Injectable, NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { AuditLogService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { UpdateItemDto } from './dto/update-item.dto';

@Injectable()
export class MenuService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  private async resolveRestaurant(ownerId: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { ownerId },
      select: { id: true },
    });
    if (!restaurant) throw new NotFoundException('No restaurant linked to this account');
    return restaurant;
  }

  async getFullMenu(ownerId: string) {
    const { id: restaurantId } = await this.resolveRestaurant(ownerId);
    return this.prisma.menuCategory.findMany({
      where: { restaurantId },
      orderBy: { sortOrder: 'asc' },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  }

  async createCategory(ownerId: string, dto: CreateCategoryDto) {
    const { id: restaurantId } = await this.resolveRestaurant(ownerId);
    const category = await this.prisma.menuCategory.create({
      data: {
        restaurantId,
        name: dto.name,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
    await this.auditLog.log({
      actorId: ownerId,
      action: 'CREATE',
      entityType: 'MenuCategory',
      entityId: category.id,
      after: { id: category.id, name: category.name, sortOrder: category.sortOrder },
    });
    return category;
  }

  async updateCategory(ownerId: string, categoryId: string, dto: UpdateCategoryDto) {
    const { id: restaurantId } = await this.resolveRestaurant(ownerId);
    const category = await this.prisma.menuCategory.findFirst({
      where: { id: categoryId, restaurantId },
    });
    if (!category) throw new NotFoundException('Category not found');

    const updated = await this.prisma.menuCategory.update({
      where: { id: categoryId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
    });
    await this.auditLog.log({
      actorId: ownerId,
      action: 'UPDATE',
      entityType: 'MenuCategory',
      entityId: categoryId,
      before: { name: category.name, sortOrder: category.sortOrder },
      after: { name: updated.name, sortOrder: updated.sortOrder },
    });
    return updated;
  }

  async deleteCategory(ownerId: string, categoryId: string) {
    const { id: restaurantId } = await this.resolveRestaurant(ownerId);
    const category = await this.prisma.menuCategory.findFirst({
      where: { id: categoryId, restaurantId },
    });
    if (!category) throw new NotFoundException('Category not found');

    await this.prisma.menuCategory.delete({ where: { id: categoryId } });
    await this.auditLog.log({
      actorId: ownerId,
      action: 'DELETE',
      entityType: 'MenuCategory',
      entityId: categoryId,
      before: { name: category.name },
    });
  }

  async createItem(ownerId: string, dto: CreateItemDto) {
    const { id: restaurantId } = await this.resolveRestaurant(ownerId);

    const category = await this.prisma.menuCategory.findFirst({
      where: { id: dto.categoryId, restaurantId },
    });
    if (!category) throw new NotFoundException('Category not found');

    const item = await this.prisma.menuItem.create({
      data: {
        restaurantId,
        categoryId: dto.categoryId,
        name: dto.name,
        description: dto.description ?? null,
        price: new Decimal(dto.price),
        isAvailable: dto.isAvailable ?? true,
        imageUrl: dto.imageUrl ?? null,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
    await this.auditLog.log({
      actorId: ownerId,
      action: 'CREATE',
      entityType: 'MenuItem',
      entityId: item.id,
      after: {
        id: item.id,
        name: item.name,
        price: item.price.toFixed(2),
        categoryId: item.categoryId,
      },
    });
    return item;
  }

  async updateItem(ownerId: string, itemId: string, dto: UpdateItemDto) {
    const { id: restaurantId } = await this.resolveRestaurant(ownerId);

    const item = await this.prisma.menuItem.findFirst({
      where: { id: itemId, restaurantId },
    });
    if (!item) throw new NotFoundException('Item not found');

    if (dto.categoryId !== undefined) {
      const cat = await this.prisma.menuCategory.findFirst({
        where: { id: dto.categoryId, restaurantId },
      });
      if (!cat) throw new NotFoundException('Category not found');
    }

    const updated = await this.prisma.menuItem.update({
      where: { id: itemId },
      data: {
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.price !== undefined && { price: new Decimal(dto.price) }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.isAvailable !== undefined && { isAvailable: dto.isAvailable }),
      },
    });
    await this.auditLog.log({
      actorId: ownerId,
      action: 'UPDATE',
      entityType: 'MenuItem',
      entityId: itemId,
      before: { name: item.name, price: item.price.toFixed(2) },
      after: { name: updated.name, price: updated.price.toFixed(2) },
    });
    return updated;
  }

  async updateItemAvailability(ownerId: string, itemId: string, dto: UpdateAvailabilityDto) {
    const { id: restaurantId } = await this.resolveRestaurant(ownerId);

    const item = await this.prisma.menuItem.findFirst({
      where: { id: itemId, restaurantId },
    });
    if (!item) throw new NotFoundException('Item not found');

    const updated = await this.prisma.menuItem.update({
      where: { id: itemId },
      data: { isAvailable: dto.isAvailable },
    });
    await this.auditLog.log({
      actorId: ownerId,
      action: 'TOGGLE_AVAILABILITY',
      entityType: 'MenuItem',
      entityId: itemId,
      before: { isAvailable: item.isAvailable },
      after: { isAvailable: updated.isAvailable },
    });
    return updated;
  }

  async deleteItem(ownerId: string, itemId: string) {
    const { id: restaurantId } = await this.resolveRestaurant(ownerId);

    const item = await this.prisma.menuItem.findFirst({
      where: { id: itemId, restaurantId },
    });
    if (!item) throw new NotFoundException('Item not found');

    await this.prisma.menuItem.delete({ where: { id: itemId } });
    await this.auditLog.log({
      actorId: ownerId,
      action: 'DELETE',
      entityType: 'MenuItem',
      entityId: itemId,
      before: { name: item.name },
    });
  }
}
