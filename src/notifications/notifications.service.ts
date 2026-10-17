import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { GetNotificationsDto } from './dto/get-notifications.dto.js';

export interface NotificationItem {
  id: number;
  type: string;
  is_read: boolean;
  created_at: string;
  actor: {
    id: number;
    email: string;
    username: string | null;
    avatar: string | null;
  } | null;
  post: {
    id: number;
    content_snippet: string;
  } | null;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) { }

  /**
   * Helper to create a notification within an existing transaction context.
   * If recipient is the actor, returns null (prevents self-notifications).
   */
  async createNotificationInTx(
    tx: any,
    recipientId: number,
    actorId: number,
    type: 'LIKE' | 'COMMENT' | 'FOLLOW',
    postId?: number,
  ) {
    if (recipientId === actorId) {
      return null;
    }

    return tx.orm.public.Notification.create({
      recipientId,
      actorId,
      type,
      postId: postId ?? null,
      isRead: false,
    });
  }

  /**
   * Retrieve notifications for a user with actor profile and post snippet.
   */

  async getUserNotifications(
    userId: number,
    query: GetNotificationsDto,
  ): Promise<NotificationItem[]> {
    const notifications = await this.prisma.orm.Notification
      .where({
        recipientId: userId,
        ...(query.is_read !== undefined ? { isRead: query.is_read } : {}),
      } as any)
      .include('actor', (actor) => actor.include('profile'))
      .include('post')
      .orderBy((n) => n.createdAt.desc())
      .limit(query.limit ?? 20)
      .all();

    return notifications.map((n) => ({
      id: n.id,
      type: n.type,
      is_read: n.isRead,
      created_at: n.createdAt,
      actor: n.actor
        ? {
          id: n.actor.id,
          email: n.actor.email,
          username: n.actor.profile?.username ?? null,
          avatar: n.actor.profile?.profilePictureUrl ?? null,
        }
        : null,
      post: n.post
        ? {
          id: n.post.id,
          content_snippet: n.post.content.slice(0, 80) +
            (n.post.content.length > 80 ? '...' : ''),
        }
        : null,
    }));
  }


  /**
   * Count unread notifications for badge counters.
   */
  async getUnreadCount(userId: number): Promise<{ unread_count: number }> {
    const unread = await this.prisma.orm.Notification
      .where({ recipientId: userId, isRead: false })
      .select('id')
      .all();

    return { unread_count: unread.length };
  }

  /**
   * Mark a specific notification as read.
   */
  async markAsRead(id: number, userId: number) {
    const notification = await this.prisma.orm.Notification
      .where({ id, recipientId: userId })
      .first();

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    await this.prisma.orm.Notification
      .where({ id })
      .update({ isRead: true });

    return { success: true, message: 'Notification marked as read' };
  }

  /**
   * Bulk mark all unread notifications as read.
   */
  async markAllAsRead(userId: number) {
    await this.prisma.orm.Notification
      .where({ recipientId: userId, isRead: false })
      .update({ isRead: true });

    return { success: true, message: 'All notifications marked as read' };
  }
}
