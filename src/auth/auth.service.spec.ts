import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AUTH_OPTIONS, AUTH_DEFAULT_ROLE } from './auth.constants.js';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            orm: {
              User: {
                where: vi.fn(),
                create: vi.fn(),
              },
              Session: {
                where: vi.fn(),
                create: vi.fn(),
              },
            },
          },
        },
        { provide: JwtService, useValue: { sign: vi.fn() } },
        { provide: ConfigService, useValue: { get: vi.fn() } },

        // DI Demonstration: Mocking custom providers with `useValue`
        {
          provide: AUTH_OPTIONS,
          useValue: {
            saltRounds: 4, // Fast salt rounds for test speed
            adminSecretCode: 'custom_mock_secret',
            sessionDurationDays: 1,
          },
        },
        {
          provide: AUTH_DEFAULT_ROLE,
          useValue: 'USER',
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined and receive injected dependencies', () => {
    expect(service).toBeDefined();
  });

  it('should reject registerAdmin when secret code does not match injected adminSecretCode', async () => {
    await expect(
      service.registerAdmin({
        email: 'admin@test.com',
        password: 'password123',
        secretCode: 'wrong_code',
      }),
    ).rejects.toThrow('Invalid admin secret code');
  });
});

