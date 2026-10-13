import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { BookmarksService } from './bookmarks.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('BookmarksService', () => {
  let service: BookmarksService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      orm: {
        Post: {
          where: vi.fn().mockReturnThis(),
          first: vi.fn(),
        },
        Bookmark: {
          where: vi.fn().mockReturnThis(),
          include: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          all: vi.fn(),
          first: vi.fn(),
          create: vi.fn(),
          delete: vi.fn(),
        },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookmarksService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<BookmarksService>(BookmarksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('toggleBookmark', () => {
    it('should throw NotFoundException if post does not exist', async () => {
      mockPrisma.orm.Post.first.mockResolvedValueOnce(null);

      await expect(service.toggleBookmark(1, 999)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrisma.orm.Post.where).toHaveBeenCalledWith({ id: 999 });
    });

    it('should remove bookmark if it already exists', async () => {
      mockPrisma.orm.Post.first.mockResolvedValueOnce({ id: 10 });
      mockPrisma.orm.Bookmark.first.mockResolvedValueOnce({ userId: 1, postId: 10 });
      mockPrisma.orm.Bookmark.delete.mockResolvedValueOnce({ count: 1 });

      const result = await service.toggleBookmark(1, 10);

      expect(mockPrisma.orm.Bookmark.where).toHaveBeenCalledWith({ userId: 1, postId: 10 });
      expect(mockPrisma.orm.Bookmark.delete).toHaveBeenCalled();
      expect(result).toEqual({
        bookmarked: false,
        isBookmarked: false,
        message: 'Bookmark removed successfully',
      });
    });

    it('should create bookmark if it does not exist', async () => {
      mockPrisma.orm.Post.first.mockResolvedValueOnce({ id: 10 });
      mockPrisma.orm.Bookmark.first.mockResolvedValueOnce(null);
      mockPrisma.orm.Bookmark.create.mockResolvedValueOnce({ userId: 1, postId: 10 });

      const result = await service.toggleBookmark(1, 10);

      expect(mockPrisma.orm.Bookmark.where).toHaveBeenCalledWith({ userId: 1, postId: 10 });
      expect(mockPrisma.orm.Bookmark.create).toHaveBeenCalledWith({ userId: 1, postId: 10 });
      expect(result).toEqual({
        bookmarked: true,
        isBookmarked: true,
        message: 'Post bookmarked successfully',
      });
    });
  });

  describe('getBookmarks', () => {
    it('should retrieve bookmarked posts with mapped author and tag info', async () => {
      const now = new Date();
      const mockBookmarks = [
        {
          createdAt: now,
          post: {
            id: 10,
            content: 'Testing bookmarks',
            createdAt: now,
            author: {
              id: 2,
              email: 'author@test.com',
              profile: {
                username: 'alice',
                profilePictureUrl: 'https://example.com/alice.jpg',
              },
            },
            tags: [
              { tag: { name: 'nestjs' } },
              { tag: { name: 'prisma' } },
            ],
          },
        },
      ];

      const queryBuilder = {
        include: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValueOnce(mockBookmarks),
      };
      mockPrisma.orm.Bookmark.where.mockReturnValueOnce(queryBuilder);

      const results = await service.getBookmarks(1, { limit: 5 });

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        bookmarked_at: now,
        post: {
          id: 10,
          content: 'Testing bookmarks',
          created_at: now,
          author: {
            id: 2,
            email: 'author@test.com',
            username: 'alice',
            avatar: 'https://example.com/alice.jpg',
          },
          tags: ['nestjs', 'prisma'],
        },
      });
    });

    it('should filter bookmarked posts by tag', async () => {
      const now = new Date();
      const mockBookmarks = [
        {
          createdAt: now,
          post: {
            id: 1,
            content: 'NestJS post',
            createdAt: now,
            author: { id: 2, email: 'a@a.com', profile: null },
            tags: [{ tag: { name: 'nestjs' } }],
          },
        },
        {
          createdAt: now,
          post: {
            id: 2,
            content: 'Postgres post',
            createdAt: now,
            author: { id: 3, email: 'b@b.com', profile: null },
            tags: [{ tag: { name: 'postgres' } }],
          },
        },
      ];

      const queryBuilder = {
        include: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValueOnce(mockBookmarks),
      };
      mockPrisma.orm.Bookmark.where.mockReturnValueOnce(queryBuilder);

      const results = await service.getBookmarks(1, { tag: 'NESTJS' });

      expect(results).toHaveLength(1);
      expect(results[0]?.post.id).toBe(1);
    });
  });
});
