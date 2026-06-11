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
  sub: string;
  email?: string;
  role?: string;
  type?: string;
  phone?: string;
  isGuest?: boolean;
}

@WebSocketGateway({
  cors: { origin: '*' },
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

    // Restaurant owner — join restaurant room
    if (payload.role === Role.RESTAURANT_OWNER) {
      if (!payload.sub) {
        socket.disconnect(true);
        return;
      }
      try {
        const restaurant = await this.prisma.restaurant.findUnique({
          where: { ownerId: payload.sub },
          select: { id: true },
        });
        if (!restaurant) {
          socket.emit('error', { message: 'No restaurant linked to this account' });
          socket.disconnect(true);
          return;
        }
        await socket.join(`restaurant:${restaurant.id}`);
        this.logger.log(`Restaurant socket ${socket.id} joined restaurant:${restaurant.id}`);
      } catch (error) {
        this.logger.warn(
          'Gateway connection error: ' + (error instanceof Error ? error.message : String(error)),
        );
        socket.disconnect(true);
      }
      return;
    }

    // Customer — join personal room for order push notifications
    if (payload.type === 'customer') {
      await socket.join(`customer:${payload.sub}`);
      this.logger.log(`Customer socket ${socket.id} joined customer:${payload.sub}`);
      return;
    }

    socket.emit('error', { message: 'Unauthorized role' });
    socket.disconnect(true);
  }

  handleDisconnect(socket: Socket): void {
    this.logger.log(`Socket ${socket.id} disconnected`);
  }

  emitToRestaurant(restaurantId: string, event: string, data: unknown): void {
    this.server.to(`restaurant:${restaurantId}`).emit(event, data);
  }

  emitToCustomer(customerId: string, event: string, data: unknown): void {
    this.server.to(`customer:${customerId}`).emit(event, data);
  }

  emitToOrder(orderId: string, event: string, data: unknown): void {
    this.server.to(`order:${orderId}`).emit(event, data);
  }
}
