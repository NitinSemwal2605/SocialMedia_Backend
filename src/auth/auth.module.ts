import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService, ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { AUTH_OPTIONS, AUTH_DEFAULT_ROLE, type AuthOptions } from './auth.constants.js';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // 1. DYNAMIC MODULE via useFactory (Async Provider with Dependency Injection)
    // The IoC container resolves ConfigService from ConfigModule and passes it to useFactory.
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'super_secret_fallback'),
        signOptions: { expiresIn: '1d' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    // 2. STANDARD CLASS PROVIDER (Shorthand for { provide: AuthService, useClass: AuthService })
    AuthService,
    JwtStrategy,

    // 3. CUSTOM VALUE PROVIDER (useValue)
    // Injects static configurations, constants, or external instances directly.
    {
      provide: AUTH_DEFAULT_ROLE,
      useValue: 'USER',
    },

    // 4. CUSTOM FACTORY PROVIDER (useFactory)
    // Dynamically constructs an AuthOptions object using injected dependencies (ConfigService).
    {
      provide: AUTH_OPTIONS,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): AuthOptions => ({
        saltRounds: Number(configService.get('BCRYPT_SALT_ROUNDS', 10)),
        adminSecretCode: configService.get<string>('ADMIN_SECRET_CODE', 'super_secret_admin_code'),
        sessionDurationDays: 1,
      }),
    },
  ],
  exports: [AuthService, AUTH_OPTIONS, AUTH_DEFAULT_ROLE],
})
export class AuthModule { }

