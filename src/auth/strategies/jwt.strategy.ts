import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'super_secret_fallback'),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: any) {
    const token = (req.headers as any).authorization?.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException();
    }

    const isValidSession = await this.authService.validateSession(token);
    if (!isValidSession) {
      throw new UnauthorizedException('Session is invalid or logged out');
    }

    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}
