import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { RegisterAdminDto } from './dto/register-admin.dto.js';
import { LoginDto } from './dto/login.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, password } = registerDto;

    const existingUser = await this.prisma.orm.User.where({ email } as any).first();
    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.prisma.orm.User
      .select('id', 'email', 'role', 'createdAt')
      .create({
        email,
        passwordHash: hashedPassword,
        role: 'USER',
      } as any);

    return {
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        created_at: user.createdAt,
      },
    };
  }

  async registerAdmin(registerDto: RegisterAdminDto) {
    const { email, password, secretCode } = registerDto;

    const adminSecret = this.configService.get<string>('ADMIN_SECRET_CODE', 'super_secret_admin_code');
    if (secretCode !== adminSecret) {
      throw new UnauthorizedException('Invalid admin secret code');
    }

    const existingUser = await this.prisma.orm.User.where({ email } as any).first();
    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.prisma.orm.User
      .select('id', 'email', 'role', 'createdAt')
      .create({
        email,
        passwordHash: hashedPassword,
        role: 'ADMIN',
      } as any);

    return {
      message: 'Admin registered successfully',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        created_at: user.createdAt,
      },
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.prisma.orm.User.where({ email } as any).first();
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const jwt_token = this.jwtService.sign(payload);

    // Calculate session expiration (1 day)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1);

    await this.prisma.orm.Session.create({
      userId: user.id,
      jwtToken: jwt_token,
      expiresAt: expiresAt.toISOString() as any,
      isActive: true,
    });

    return {
      message: 'Login successful',
      access_token: jwt_token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        created_at: user.createdAt,
      },
    };
  }

  async logout(token: string) {
    await this.prisma.orm.Session
      .where({ jwtToken: token })
      .update({ isActive: false });
    return { message: 'Logged out successfully' };
  }

  async validateSession(token: string): Promise<boolean> {
    const session = await this.prisma.orm.Session
      .where({ jwtToken: token })
      .first();

    if (!session) return false;
    if (!session.isActive) return false;
    return new Date(session.expiresAt) > new Date();
  }
}
