import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      orm: {
        Notification: {
          where: vi.fn().mockReturnThis(),
          include: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          all: vi.fn(),
          first: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
        },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createNotificationInTx', () => {
    it('should return null if recipient is the actor (self-notification)', async () => {
      const mockTx = {
        orm: {
          public: {
            Notification: { create: vi.fn() },
          },
        },
      };

      const result = await service.createNotificationInTx(mockTx, 1, 1, 'LIKE', 10);

      expect(result).toBeNull();
      expect(mockTx.orm.public.Notification.create).not.toHaveBeenCalled();
    });

    it('should create notification in transaction if recipient is not the actor', async () => {
      const mockTx = {
        orm: {
          public: {
            Notification: {
              create: vi.fn().mockResolvedValueOnce({ id: 100 }),
            },
          },
        },
      };

      const result = await service.createNotificationInTx(mockTx, 2, 1, 'LIKE', 10);

      expect(result).toEqual({ id: 100 });
      expect(mockTx.orm.public.Notification.create).toHaveBeenCalledWith({
        recipientId: 2,
        actorId: 1,
        type: 'LIKE',
        postId: 10,
        isRead: false,
      });
    });
  });

  describe('getUserNotifications', () => {
    it('should query and format notifications with actor profile and truncated post snippet', async () => {
      const now = new Date().toISOString();
      const mockNotifications = [
        {
          id: 1,
          type: 'LIKE',
          isRead: false,
          createdAt: now,
          actor: {
            id: 2,
            email: 'actor@example.com',
            profile: {
              username: 'actor_user',
              profilePictureUrl: 'https://example.com/pic.png',
            },
          },
          post: {
            id: 10,
            content:
              'This is a very long post content that exceeds eighty characters in total length to test snippet truncation properly.',
          },
        },
      ];

      const queryBuilder = {
        include: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValueOnce(mockNotifications),
      };
      mockPrisma.orm.Notification.where.mockReturnValueOnce(queryBuilder);

      const result = await service.getUserNotifications(1, { limit: 10, is_read: false });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 1,
        type: 'LIKE',
        is_read: false,
        created_at: now,
        actor: {
          id: 2,
          email: 'actor@example.com',
          username: 'actor_user',
          avatar: 'https://example.com/pic.png',
        },
        post: {
          id: 10,
          content_snippet:
            'This is a very long post content that exceeds eighty characters in total length ...',
        },
      });
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count for user', async () => {
      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValueOnce([{ id: 1 }, { id: 2 }, { id: 3 }]),
      };
      mockPrisma.orm.Notification.where.mockReturnValueOnce(queryBuilder);

      const result = await service.getUnreadCount(1);

      expect(mockPrisma.orm.Notification.where).toHaveBeenCalledWith({
        recipientId: 1,
        isRead: false,
      });
      expect(result).toEqual({ unread_count: 3 });
    });
  });

  describe('markAsRead', () => {
    it('should throw NotFoundException if notification does not exist or does not belong to user', async () => {
      mockPrisma.orm.Notification.first.mockResolvedValueOnce(null);

      await expect(service.markAsRead(999, 1)).rejects.toThrow(NotFoundException);
      expect(mockPrisma.orm.Notification.where).toHaveBeenCalledWith({
        id: 999,
        recipientId: 1,
      });
    });

    it('should update isRead to true if notification belongs to user', async () => {
      mockPrisma.orm.Notification.first.mockResolvedValueOnce({ id: 5, recipientId: 1 });
      mockPrisma.orm.Notification.update.mockResolvedValueOnce({ count: 1 });

      const result = await service.markAsRead(5, 1);

      expect(mockPrisma.orm.Notification.update).toHaveBeenCalledWith({ isRead: true });
      expect(result).toEqual({ success: true, message: 'Notification marked as read' });
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread notifications for recipient as read', async () => {
      mockPrisma.orm.Notification.update.mockResolvedValueOnce({ count: 4 });

      const result = await service.markAllAsRead(1);

      expect(mockPrisma.orm.Notification.where).toHaveBeenCalledWith({
        recipientId: 1,
        isRead: false,
      });
      expect(mockPrisma.orm.Notification.update).toHaveBeenCalledWith({ isRead: true });
      expect(result).toEqual({ success: true, message: 'All notifications marked as read' });
    });
  });
});
