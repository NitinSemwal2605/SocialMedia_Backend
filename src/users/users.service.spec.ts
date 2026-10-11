import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UsersService } from './users.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('UsersService', () => {
  let service: UsersService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      orm: {
        User: {
          select: vi.fn().mockReturnThis(),
          create: vi.fn(),
          all: vi.fn(),
          where: vi.fn().mockReturnThis(),
          first: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
          include: vi.fn().mockReturnThis(),
        },
        UserProfile: {
          where: vi.fn().mockReturnThis(),
          first: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
        },
        Follower: {
          where: vi.fn().mockReturnThis(),
          first: vi.fn(),
          create: vi.fn(),
          delete: vi.fn(),
          include: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockReturnThis(),
          all: vi.fn(),
        },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
