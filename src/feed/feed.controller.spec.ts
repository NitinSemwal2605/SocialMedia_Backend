import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FeedController } from './feed.controller.js';
import { FeedService } from './feed.service.js';
import { GetFeedDto } from './dto/get-feed.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

describe('FeedController', () => {
  let controller: FeedController;
  let mockFeedService: { getFeed: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mockFeedService = {
      getFeed: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FeedController],
      providers: [
        {
          provide: FeedService,
          useValue: mockFeedService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<FeedController>(FeedController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call feedService.getFeed with authenticated user ID and query parameters', async () => {
    const expectedResponse = {
      data: [],
      pagination: {
        limit: 10,
        cursor: null,
        next_cursor: null,
        has_more: false,
      },
    };

    mockFeedService.getFeed.mockResolvedValueOnce(expectedResponse);

    const req = { user: { userId: 42 } };
    const query: GetFeedDto = { limit: 10, cursor: 5 };

    const result = await controller.getFeed(req, query);

    expect(mockFeedService.getFeed).toHaveBeenCalledWith(42, query);
    expect(result).toBe(expectedResponse);
  });
});
