import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { GetNotificationsDto } from './dto/get-notifications.dto.js';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let mockNotificationsService: {
    getUserNotifications: ReturnType<typeof vi.fn>;
    getUnreadCount: ReturnType<typeof vi.fn>;
    markAsRead: ReturnType<typeof vi.fn>;
    markAllAsRead: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockNotificationsService = {
      getUserNotifications: vi.fn(),
      getUnreadCount: vi.fn(),
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<NotificationsController>(NotificationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should get user notifications', async () => {
    const expected = [
      {
        id: 1,
        type: 'LIKE',
        is_read: false,
        created_at: new Date().toISOString(),
        actor: { id: 2, email: 'actor@example.com', username: 'actor', avatar: null },
        post: { id: 10, content_snippet: 'Test post content' },
      },
    ];
    mockNotificationsService.getUserNotifications.mockResolvedValueOnce(expected);

    const req = { user: { userId: 1 } };
    const query: GetNotificationsDto = { limit: 10, is_read: false };
    const result = await controller.getNotifications(req, query);

    expect(mockNotificationsService.getUserNotifications).toHaveBeenCalledWith(1, query);
    expect(result).toBe(expected);
  });

  it('should get unread count', async () => {
    mockNotificationsService.getUnreadCount.mockResolvedValueOnce({ unread_count: 5 });

    const req = { user: { userId: 1 } };
    const result = await controller.getUnreadCount(req);

    expect(mockNotificationsService.getUnreadCount).toHaveBeenCalledWith(1);
    expect(result).toEqual({ unread_count: 5 });
  });

  it('should mark a notification as read', async () => {
    mockNotificationsService.markAsRead.mockResolvedValueOnce({
      success: true,
      message: 'Notification marked as read',
    });

    const req = { user: { userId: 1 } };
    const result = await controller.markAsRead(42, req);

    expect(mockNotificationsService.markAsRead).toHaveBeenCalledWith(42, 1);
    expect(result).toEqual({
      success: true,
      message: 'Notification marked as read',
    });
  });

  it('should mark all notifications as read', async () => {
    mockNotificationsService.markAllAsRead.mockResolvedValueOnce({
      success: true,
      message: 'All notifications marked as read',
    });

    const req = { user: { userId: 1 } };
    const result = await controller.markAllAsRead(req);

    expect(mockNotificationsService.markAllAsRead).toHaveBeenCalledWith(1);
    expect(result).toEqual({
      success: true,
      message: 'All notifications marked as read',
    });
  });
});
