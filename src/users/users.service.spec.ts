import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UsersService } from './users.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('UsersService', () => {
  let service: UsersService;
  let mockPrisma: any;
  let mockTx: any;

  beforeEach(async () => {
    mockTx = {
      orm: {
        public: {
          Follower: {
            where: vi.fn().mockReturnThis(),
            first: vi.fn(),
            create: vi.fn(),
            delete: vi.fn(),
          },
          Notification: {
            create: vi.fn(),
          },
        },
      },
    };

    mockPrisma = {
      client: {
        transaction: vi.fn().mockImplementation(async (callback) => callback(mockTx)),
      },
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

  describe('toggleFollow', () => {
    it('should throw an error when attempting to follow oneself', async () => {
      await expect(service.toggleFollow(1, 1)).rejects.toThrow('You cannot follow yourself');
    });

    it('should unfollow user when already following and not create notification', async () => {
      vi.spyOn(service, 'findOne').mockResolvedValueOnce({
        id: 2,
        email: 'user2@example.com',
        role: 'USER',
        created_at: new Date(),
      } as any);

      mockTx.orm.public.Follower.first.mockResolvedValueOnce({
        followerId: 1,
        followingId: 2,
      });

      const result = await service.toggleFollow(1, 2);

      expect(mockTx.orm.public.Follower.delete).toHaveBeenCalled();
      expect(mockTx.orm.public.Notification.create).not.toHaveBeenCalled();
      expect(result).toEqual({ message: 'Successfully unfollowed user 2' });
    });

    it('should follow user and dispatch FOLLOW notification when not already following', async () => {
      vi.spyOn(service, 'findOne').mockResolvedValueOnce({
        id: 2,
        email: 'user2@example.com',
        role: 'USER',
        created_at: new Date(),
      } as any);

      mockTx.orm.public.Follower.first.mockResolvedValueOnce(null);

      const result = await service.toggleFollow(1, 2);

      expect(mockTx.orm.public.Follower.create).toHaveBeenCalledWith({
        followerId: 1,
        followingId: 2,
      });
      expect(mockTx.orm.public.Notification.create).toHaveBeenCalledWith({
        recipientId: 2,
        actorId: 1,
        type: 'FOLLOW',
        postId: null,
        isRead: false,
      });
      expect(result).toEqual({ message: 'Successfully followed user 2' });
    });
  });
});
