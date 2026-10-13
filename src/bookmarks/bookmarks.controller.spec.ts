import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BookmarksController } from './bookmarks.controller.js';
import { BookmarksService } from './bookmarks.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { GetBookmarksDto } from './dto/get-bookmarks.dto.js';

describe('BookmarksController', () => {
  let controller: BookmarksController;
  let mockBookmarksService: {
    toggleBookmark: ReturnType<typeof vi.fn>;
    getBookmarks: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockBookmarksService = {
      toggleBookmark: vi.fn(),
      getBookmarks: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookmarksController],
      providers: [
        {
          provide: BookmarksService,
          useValue: mockBookmarksService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<BookmarksController>(BookmarksController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should toggle bookmark status for a post', async () => {
    const expectedResult = {
      bookmarked: true,
      isBookmarked: true,
      message: 'Post bookmarked successfully',
    };
    mockBookmarksService.toggleBookmark.mockResolvedValueOnce(expectedResult);

    const req = { user: { userId: 1 } };
    const result = await controller.toggleBookmark(10, req);

    expect(mockBookmarksService.toggleBookmark).toHaveBeenCalledWith(1, 10);
    expect(result).toBe(expectedResult);
  });

  it('should retrieve bookmarks with query parameters', async () => {
    const expectedResult = [
      {
        bookmarked_at: new Date(),
        post: {
          id: 10,
          content: 'Bookmarked post',
          created_at: new Date(),
          author: {
            id: 2,
            email: 'author@example.com',
            username: 'author',
            avatar: null,
          },
          tags: ['nestjs', 'prisma'],
        },
      },
    ];
    mockBookmarksService.getBookmarks.mockResolvedValueOnce(expectedResult);

    const req = { user: { userId: 1 } };
    const query: GetBookmarksDto = { tag: 'nestjs', limit: 10 };
    const result = await controller.getBookmarks(req, query);

    expect(mockBookmarksService.getBookmarks).toHaveBeenCalledWith(1, query);
    expect(result).toBe(expectedResult);
  });
});
