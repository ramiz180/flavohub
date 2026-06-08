import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CustomerAuthService } from './customer-auth.service';
import { CustomerJwtAuthGuard } from './guards/customer-jwt-auth.guard';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

interface CustomerRequest extends Express.Request {
  user: { customerId: string; phone: string; isGuest: boolean };
}

@ApiTags('customer-auth')
@Controller('customer/auth')
export class CustomerAuthController {
  constructor(private readonly authService: CustomerAuthService) {}

  @Post('otp/request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request OTP (mock: always 123456 in dev)' })
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.authService.requestOtp(dto);
  }

  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP and receive access + refresh tokens' })
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshAccessToken(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout (client discards token)' })
  logout() {
    return { success: true, message: 'Logged out' };
  }

  @Get('me')
  @UseGuards(CustomerJwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current customer profile' })
  getMe(@Request() req: CustomerRequest) {
    return this.authService.getMe(req.user.customerId);
  }
}
