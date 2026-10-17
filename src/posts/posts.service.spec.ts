import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PostsService } from './posts.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('PostsService', () => {
  let service: PostsService;
  let mockPrisma: any;
  let mockTx: any;

  beforeEach(async () => {
    mockTx = {
      orm: {
        public: {
          PostLike: {
            where: vi.fn().mockReturnThis(),
            first: vi.fn(),
            create: vi.fn(),
            delete: vi.fn(),
          },
          PostComment: {
            create: vi.fn(),
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

  describe('toggleLike', () => {
    it('should unlike post if already liked and not create notification', async () => {
      vi.spyOn(service, 'findOne').mockResolvedValueOnce({
        id: 10,
        author_id: 2,
        content: 'Test post',
        created_at: new Date(),
        updated_at: new Date(),
        author_email: 'author@test.com',
        like_count: 1,
      } as any);

      mockTx.orm.public.PostLike.first.mockResolvedValueOnce({ postId: 10, userId: 1 });

      const result = await service.toggleLike(10, 1);

      expect(mockTx.orm.public.PostLike.delete).toHaveBeenCalled();
      expect(mockTx.orm.public.Notification.create).not.toHaveBeenCalled();
      expect(result).toEqual({ message: 'Post unliked successfully' });
    });

    it('should like post and dispatch LIKE notification when liking another users post', async () => {
      vi.spyOn(service, 'findOne').mockResolvedValueOnce({
        id: 10,
        author_id: 2,
        content: 'Test post',
        created_at: new Date(),
        updated_at: new Date(),
        author_email: 'author@test.com',
        like_count: 0,
      } as any);

      mockTx.orm.public.PostLike.first.mockResolvedValueOnce(null);

      const result = await service.toggleLike(10, 1);

      expect(mockTx.orm.public.PostLike.create).toHaveBeenCalledWith({ postId: 10, userId: 1 });
      expect(mockTx.orm.public.Notification.create).toHaveBeenCalledWith({
        recipientId: 2,
        actorId: 1,
        type: 'LIKE',
        postId: 10,
        isRead: false,
      });
      expect(result).toEqual({ message: 'Post liked successfully' });
    });

    it('should like post and NOT dispatch notification when liking own post', async () => {
      vi.spyOn(service, 'findOne').mockResolvedValueOnce({
        id: 10,
        author_id: 1,
        content: 'Own post',
        created_at: new Date(),
        updated_at: new Date(),
        author_email: 'author@test.com',
        like_count: 0,
      } as any);

      mockTx.orm.public.PostLike.first.mockResolvedValueOnce(null);

      const result = await service.toggleLike(10, 1);

      expect(mockTx.orm.public.PostLike.create).toHaveBeenCalledWith({ postId: 10, userId: 1 });
      expect(mockTx.orm.public.Notification.create).not.toHaveBeenCalled();
      expect(result).toEqual({ message: 'Post liked successfully' });
    });
  });

  describe('addComment', () => {
    it('should add comment and dispatch COMMENT notification when commenting on another users post', async () => {
      vi.spyOn(service, 'findOne').mockResolvedValueOnce({
        id: 10,
        author_id: 2,
        content: 'Post',
        created_at: new Date(),
        updated_at: new Date(),
        author_email: 'author@test.com',
        like_count: 0,
      } as any);

      const now = new Date();
      mockTx.orm.public.PostComment.create.mockResolvedValueOnce({
        id: 1,
        postId: 10,
        authorId: 1,
        content: 'Nice post!',
        createdAt: now,
        updatedAt: now,
      });

      const result = await service.addComment(10, 1, { content: 'Nice post!' });

      expect(mockTx.orm.public.PostComment.create).toHaveBeenCalledWith({
        postId: 10,
        authorId: 1,
        content: 'Nice post!',
      });
      expect(mockTx.orm.public.Notification.create).toHaveBeenCalledWith({
        recipientId: 2,
        actorId: 1,
        type: 'COMMENT',
        postId: 10,
        isRead: false,
      });
      expect(result.id).toBe(1);
    });

    it('should add comment and NOT dispatch notification when commenting on own post', async () => {
      vi.spyOn(service, 'findOne').mockResolvedValueOnce({
        id: 10,
        author_id: 1,
        content: 'Own post',
        created_at: new Date(),
        updated_at: new Date(),
        author_email: 'me@test.com',
        like_count: 0,
      } as any);

      const now = new Date();
      mockTx.orm.public.PostComment.create.mockResolvedValueOnce({
        id: 2,
        postId: 10,
        authorId: 1,
        content: 'Self comment',
        createdAt: now,
        updatedAt: now,
      });

      const result = await service.addComment(10, 1, { content: 'Self comment' });

      expect(mockTx.orm.public.PostComment.create).toHaveBeenCalledWith({
        postId: 10,
        authorId: 1,
        content: 'Self comment',
      });
      expect(mockTx.orm.public.Notification.create).not.toHaveBeenCalled();
      expect(result.id).toBe(2);
    });
  });
});
