import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AppConfigService } from '../config/app-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@Injectable()
export class CustomerAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: AppConfigService,
  ) {}

  async requestOtp(dto: RequestOtpDto) {
    const { phone } = dto;

    await this.prisma.customerOtp.deleteMany({ where: { phone, used: false } });

    // TODO: replace with MSG91 SMS call before production
    const code = '123456';
    await this.prisma.customerOtp.create({
      data: {
        phone,
        code,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        used: false,
      },
    });

    return {
      sent: true,
      ...(this.config.nodeEnv !== 'production' && { devCode: '123456' }),
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const { phone, code } = dto;

    const otp = await this.prisma.customerOtp.findFirst({
      where: { phone, used: false },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) {
      throw new BadRequestException('OTP not found or expired');
    }
    if (otp.expiresAt < new Date()) {
      throw new BadRequestException('OTP has expired');
    }
    if (otp.code !== code) {
      throw new BadRequestException('Invalid OTP');
    }

    await this.prisma.customerOtp.update({ where: { id: otp.id }, data: { used: true } });

    let customer = await this.prisma.customer.findUnique({ where: { phone } });
    if (!customer) {
      customer = await this.prisma.customer.create({
        data: { phone, isGuest: false, isActive: true },
      });
    }

    if (!customer.isActive) {
      throw new ForbiddenException('Account is disabled');
    }

    const accessToken = this.jwt.sign(
      { sub: customer.id, type: 'customer', phone: customer.phone, isGuest: false },
      { secret: this.config.jwtAccessSecret, expiresIn: this.config.jwtAccessTtl },
    );

    const refreshToken = this.jwt.sign(
      { sub: customer.id, type: 'customer-refresh', phone: customer.phone },
      { secret: this.config.jwtRefreshSecret, expiresIn: this.config.jwtRefreshTtl },
    );

    return {
      accessToken,
      refreshToken,
      customer: {
        id: customer.id,
        phone: customer.phone,
        name: customer.name,
        email: customer.email,
        isGuest: customer.isGuest,
        createdAt: customer.createdAt,
      },
    };
  }

  async refreshAccessToken(refreshToken: string) {
    let payload: { sub: string; type: string; phone: string };
    try {
      payload = this.jwt.verify(refreshToken, { secret: this.config.jwtRefreshSecret });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.type !== 'customer-refresh') {
      throw new UnauthorizedException();
    }

    const customer = await this.prisma.customer.findUnique({ where: { id: payload.sub } });
    if (!customer || !customer.isActive) {
      throw new UnauthorizedException('Account not found or disabled');
    }

    const accessToken = this.jwt.sign(
      { sub: customer.id, type: 'customer', phone: customer.phone, isGuest: false },
      { secret: this.config.jwtAccessSecret, expiresIn: this.config.jwtAccessTtl },
    );

    return { accessToken };
  }

  async getMe(customerId: string) {
    return this.prisma.customer.findUniqueOrThrow({
      where: { id: customerId },
      select: {
        id: true,
        phone: true,
        name: true,
        email: true,
        isGuest: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}
