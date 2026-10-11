import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FeedService } from './feed.service.js';
import { DatabaseService } from '../database/database.service.js';
import { GetFeedDto } from './dto/get-feed.dto.js';

describe('FeedService', () => {
  let service: FeedService;
  let mockDatabaseService: { query: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mockDatabaseService = {
      query: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedService,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
      ],
    }).compile();

    service = module.get<FeedService>(FeedService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getFeed', () => {
    it('should query feed posts for followed users with cursor pagination limit + 1', async () => {
      const mockRows = [
        {
          id: 20,
          content: 'Post 20',
          created_at: new Date('2026-10-11T10:00:00Z'),
          updated_at: new Date('2026-10-11T10:00:00Z'),
          author_id: 2,
          author_email: 'user2@example.com',
          author_username: 'user2',
          author_full_name: 'User Two',
          author_profile_picture_url: null,
          like_count: 5,
          comment_count: 2,
          is_liked: true,
        },
        {
          id: 19,
          content: 'Post 19',
          created_at: new Date('2026-10-11T09:00:00Z'),
          updated_at: new Date('2026-10-11T09:00:00Z'),
          author_id: 3,
          author_email: 'user3@example.com',
          author_username: 'user3',
          author_full_name: 'User Three',
          author_profile_picture_url: 'https://example.com/pic.jpg',
          like_count: 0,
          comment_count: 0,
          is_liked: false,
        },
        {
          id: 18,
          content: 'Post 18 (overflow item for pagination detection)',
          created_at: new Date('2026-10-11T08:00:00Z'),
          updated_at: new Date('2026-10-11T08:00:00Z'),
          author_id: 2,
          author_email: 'user2@example.com',
          author_username: 'user2',
          author_full_name: 'User Two',
          author_profile_picture_url: null,
          like_count: 1,
          comment_count: 0,
          is_liked: false,
        },
      ];

      mockDatabaseService.query.mockResolvedValueOnce({ rows: mockRows });

      const queryDto: GetFeedDto = {
        limit: 2,
      };

      const result = await service.getFeed(1, queryDto);

      expect(mockDatabaseService.query).toHaveBeenCalledTimes(1);
      const [sql, params] = mockDatabaseService.query.mock.calls[0];

      // Verifies SQL joins followers, users, user_profiles, post_likes, post_comments
      expect(sql).toContain('JOIN followers f ON p.author_id = f.following_id');
      expect(sql).toContain('JOIN users u ON p.author_id = u.id');
      expect(sql).toContain('LEFT JOIN user_profiles pr ON u.id = pr.user_id');
      expect(sql).toContain('ORDER BY p.id DESC');
      expect(params).toEqual([1, 3]); // userId: 1, fetchLimit: 2 + 1 = 3

      // Verifies cursor pagination handling: sliced to limit=2, nextCursor=19, hasMore=true
      expect(result.data).toHaveLength(2);
      expect(result.data[0].id).toBe(20);
      expect(result.data[0].author.username).toBe('user2');
      expect(result.data[0].is_liked).toBe(true);
      expect(result.pagination).toEqual({
        limit: 2,
        cursor: null,
        next_cursor: 19,
        has_more: true,
      });
    });

    it('should handle cursor pagination using WHERE p.id < $cursor', async () => {
      mockDatabaseService.query.mockResolvedValueOnce({
        rows: [
          {
            id: 15,
            content: 'Post 15',
            created_at: new Date(),
            updated_at: new Date(),
            author_id: 2,
            author_email: 'user2@example.com',
            author_username: null,
            author_full_name: null,
            author_profile_picture_url: null,
            like_count: 0,
            comment_count: 0,
            is_liked: false,
          },
        ],
      });

      const queryDto: GetFeedDto = {
        cursor: 18,
        limit: 10,
      };

      const result = await service.getFeed(1, queryDto);

      const [sql, params] = mockDatabaseService.query.mock.calls[0];
      expect(sql).toContain('p.id < $2');
      expect(params).toEqual([1, 18, 11]);

      expect(result.data).toHaveLength(1);
      expect(result.pagination).toEqual({
        limit: 10,
        cursor: 18,
        next_cursor: null,
        has_more: false,
      });
    });

    it('should support last_id alias for cursor pagination', async () => {
      mockDatabaseService.query.mockResolvedValueOnce({ rows: [] });

      const queryDto: GetFeedDto = {
        last_id: 50,
        limit: 10,
      };

      const result = await service.getFeed(1, queryDto);

      const [sql, params] = mockDatabaseService.query.mock.calls[0];
      expect(sql).toContain('p.id < $2');
      expect(params).toEqual([1, 50, 11]);
      expect(result.data).toEqual([]);
      expect(result.pagination.has_more).toBe(false);
      expect(result.pagination.next_cursor).toBeNull();
    });

    it('should support include_self to include own posts in feed', async () => {
      mockDatabaseService.query.mockResolvedValueOnce({ rows: [] });

      const queryDto: GetFeedDto = {
        limit: 10,
        include_self: true,
      };

      await service.getFeed(1, queryDto);

      const [sql] = mockDatabaseService.query.mock.calls[0];
      expect(sql).toContain('LEFT JOIN followers f');
      expect(sql).toContain('WHERE (f.follower_id IS NOT NULL OR p.author_id = $1)');
    });
  });
});
