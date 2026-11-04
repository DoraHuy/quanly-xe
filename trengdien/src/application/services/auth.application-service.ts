import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';
import { PasswordHelper } from '../../infrastructure/security/password.helper.js';

@Injectable()
export class AuthApplicationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(usernameOrEmail: string, password: string) {
    const trimmed = usernameOrEmail.trim();
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ username: trimmed }, { email: trimmed }],
        active: true,
      },
    });

    if (!user || !PasswordHelper.verify(password, user.passwordHash)) {
      throw new UnauthorizedException('Tên đăng nhập hoặc mật khẩu không chính xác');
    }

    const payload = {
      sub: user.id,
      userId: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
    };

    const token = await this.jwtService.signAsync(payload);

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user || !user.active) {
      throw new UnauthorizedException('Phiên đăng nhập không hợp lệ');
    }
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
    };
  }

  async updateProfile(userId: string, data: { name?: string; email?: string; phone?: string }) {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name ? { name: data.name.trim() } : {}),
        ...(data.email ? { email: data.email.trim() } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
      },
    });
    return {
      id: updated.id,
      username: updated.username,
      email: updated.email,
      name: updated.name,
      phone: updated.phone,
      role: updated.role,
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !PasswordHelper.verify(currentPassword, user.passwordHash)) {
      throw new BadRequestException('Mật khẩu hiện tại không đúng');
    }
    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestException('Mật khẩu mới phải có ít nhất 6 ký tự');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: PasswordHelper.hash(newPassword) },
    });
    return { changed: true };
  }
}

