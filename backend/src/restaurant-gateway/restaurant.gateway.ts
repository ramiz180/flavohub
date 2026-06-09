import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { Role } from '@flavohub/shared';
import { PrismaService } from '../prisma/prisma.service';

interface JwtPayload {
  id: string;
  email: string;
  role: string;
}

@WebSocketGateway({
  cors: { origin: ['http://localhost:3001', 'http://localhost:3002'] },
  transports: ['websocket', 'polling'],
})
export class RestaurantGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RestaurantGateway.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(socket: Socket): Promise<void> {
    const token = socket.handshake.auth['token'] as string | undefined;

    if (!token) {
      socket.emit('error', { message: 'Missing auth token' });
      socket.disconnect(true);
      return;
    }

    let payload: JwtPayload;
    try {
      payload = this.jwt.verify<JwtPayload>(token);
    } catch {
      socket.emit('error', { message: 'Invalid auth token' });
      socket.disconnect(true);
      return;
    }

    if (payload.role !== Role.RESTAURANT_OWNER) {
      socket.emit('error', { message: 'Not authorized: RESTAURANT_OWNER role required' });
      socket.disconnect(true);
      return;
    }

    if (!payload.id) {
      socket.disconnect(true);
      return;
    }

    let restaurant: { id: string } | null;
    try {
      restaurant = await this.prisma.restaurant.findUnique({
        where: { ownerId: payload.id },
        select: { id: true },
      });
    } catch (error) {
      this.logger.warn(
        'Gateway connection error: ' + (error instanceof Error ? error.message : String(error)),
      );
      socket.disconnect(true);
      return;
    }

    if (!restaurant) {
      socket.emit('error', { message: 'No restaurant linked to this account' });
      socket.disconnect(true);
      return;
    }

    await socket.join(`restaurant:${restaurant.id}`);
    this.logger.log(`Socket ${socket.id} joined restaurant:${restaurant.id}`);
  }

  handleDisconnect(socket: Socket): void {
    this.logger.log(`Socket ${socket.id} disconnected`);
  }

  emitToRestaurant(restaurantId: string, event: string, data: unknown): void {
    this.server.to(`restaurant:${restaurantId}`).emit(event, data);
  }
}
