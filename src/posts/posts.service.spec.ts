import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PostsService } from './posts.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('PostsService', () => {
  let service: PostsService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      orm: {
        Post: {
          create: vi.fn(),
          where: vi.fn().mockReturnThis(),
          include: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockReturnThis(),
          all: vi.fn(),
          first: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
        },
        PostLike: {
          where: vi.fn().mockReturnThis(),
          first: vi.fn(),
          create: vi.fn(),
          delete: vi.fn(),
        },
        PostComment: {
          create: vi.fn(),
          where: vi.fn().mockReturnThis(),
          include: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockReturnThis(),
          all: vi.fn(),
        },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PostsService>(PostsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
