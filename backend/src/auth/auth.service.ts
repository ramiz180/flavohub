import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { verify } from 'argon2';
import { Role } from '@flavohub/shared';
import { AppConfigService } from '../config/app-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit/audit.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: AppConfigService,
    private readonly auditLog: AuditLogService,
  ) {}

  async login(dto: LoginDto) {
    const email = dto.email.trim();
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await verify(user.passwordHash, dto.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const role = user.role as unknown as Role;

    await this.auditLog.log({
      actorId: user.id,
      action: 'LOGIN',
      entityType: 'User',
      entityId: user.id,
    });

    return {
      accessToken: this.signAccess(user.id, user.email, role),
      refreshToken: this.signRefresh(user.id),
      user: { id: user.id, email: user.email, fullName: user.fullName, role },
    };
  }

  async refresh(dto: RefreshDto) {
    let sub: string;
    try {
      const payload = this.jwt.verify<{ sub: string }>(dto.refreshToken, {
        secret: this.config.jwtRefreshSecret,
      });
      sub = payload.sub;
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.prisma.user.findUnique({ where: { id: sub } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid token');
    }

    return { accessToken: this.signAccess(user.id, user.email, user.role as unknown as Role) };
  }

  // Stateless logout — client discards tokens.
  // TODO: revoke refresh token via Redis blocklist in Part 3.
  logout(): { message: string } {
    return { message: 'Logged out' };
  }

  private signAccess(sub: string, email: string, role: Role): string {
    const payload: JwtPayload = { sub, email, role };
    return this.jwt.sign(payload, {
      secret: this.config.jwtAccessSecret,
      expiresIn: this.config.jwtAccessTtl,
    });
  }

  private signRefresh(sub: string): string {
    return this.jwt.sign(
      { sub },
      {
        secret: this.config.jwtRefreshSecret,
        expiresIn: this.config.jwtRefreshTtl,
      },
    );
  }
}
