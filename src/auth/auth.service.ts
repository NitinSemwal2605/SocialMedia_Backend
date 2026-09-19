import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { DatabaseService } from '../database/database.service.js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private databaseService: DatabaseService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(registerDto: any) {
    const { email, password } = registerDto;
    
    const existingUser = await this.databaseService.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      throw new BadRequestException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await this.databaseService.query(
      'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role',
      [email, hashedPassword, 'USER']
    );

    return result.rows[0];
  }

  async registerAdmin(registerDto: any) {
    const { email, password, secretCode } = registerDto;
    
    const adminSecret = this.configService.get<string>('ADMIN_SECRET_CODE', 'super_secret_admin_code');
    if (secretCode !== adminSecret) {
      throw new UnauthorizedException('Invalid admin secret code');
    }

    const existingUser = await this.databaseService.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      throw new BadRequestException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await this.databaseService.query(
      'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role',
      [email, hashedPassword, 'ADMIN']
    );

    return result.rows[0];
  }

  async login(loginDto: any) {
    const { email, password } = loginDto;
    
    const result = await this.databaseService.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const jwt_token = this.jwtService.sign(payload);
    
    // Calculate expiration (e.g., 1 day from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1);

    // Save session in DB
    await this.databaseService.query(
      'INSERT INTO sessions (user_id, jwt_token, expires_at, is_active) VALUES ($1, $2, $3, true)',
      [user.id, jwt_token, expiresAt]
    );

    return { access_token: jwt_token };
  }

  async logout(token: string) {
    await this.databaseService.query(
      'UPDATE sessions SET is_active = false WHERE jwt_token = $1',
      [token]
    );
    return { message: 'Logged out successfully' };
  }

  async validateSession(token: string): Promise<boolean> {
    const result = await this.databaseService.query(
      'SELECT is_active FROM sessions WHERE jwt_token = $1 AND expires_at > NOW()',
      [token]
    );
    
    if (result.rows.length === 0) return false;
    return result.rows[0].is_active;
  }
}
