import { Injectable, UnauthorizedException, BadRequestException, Inject, Optional } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { RegisterAdminDto } from './dto/register-admin.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { AUTH_OPTIONS, AUTH_DEFAULT_ROLE, type AuthOptions } from './auth.constants.js';

@Injectable()
export class AuthService {
  private readonly saltRounds: number;
  private readonly adminSecret: string;
  private readonly sessionDurationDays: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,

    // Custom Provider DI Injections using @Inject(TOKEN):
    @Optional()
    @Inject(AUTH_OPTIONS)
    private readonly authOptions?: AuthOptions,

    @Optional()
    @Inject(AUTH_DEFAULT_ROLE)
    private readonly defaultRole: string = 'USER',
  ) {
    this.saltRounds = this.authOptions?.saltRounds ?? 10;
    this.adminSecret =
      this.authOptions?.adminSecretCode ??
      this.configService?.get<string>('ADMIN_SECRET_CODE', 'super_secret_admin_code');
    this.sessionDurationDays = this.authOptions?.sessionDurationDays ?? 1;
  }

  async register(registerDto: RegisterDto) {
    const { email, password } = registerDto;

    const existingUser = await this.prisma.orm.User.where({ email } as any).first();
    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, this.saltRounds);
    const user = await this.prisma.orm.User
      .select('id', 'email', 'role', 'createdAt')
      .create({
        email,
        passwordHash: hashedPassword,
        role: this.defaultRole,
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

    if (secretCode !== this.adminSecret) {
      throw new UnauthorizedException('Invalid admin secret code');
    }

    const existingUser = await this.prisma.orm.User.where({ email } as any).first();
    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, this.saltRounds);
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

    // Calculate session expiration using injected sessionDurationDays
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.sessionDurationDays);

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
