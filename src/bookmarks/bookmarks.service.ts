import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { GetBookmarksDto } from './dto/get-bookmarks.dto.js';

@Injectable()
export class BookmarksService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Toggle bookmark status for a post.
   */
  async toggleBookmark(userId: number, postId: number) {
    const post = await this.prisma.orm.Post.where({ id: postId }).first();
    if (!post) {
      throw new NotFoundException(`Post with ID ${postId} not found`);
    }

    const existing = await this.prisma.orm.Bookmark
      .where({ userId, postId })
      .first();

    if (existing) {
      // Bookmark has no id field — composite PK is (userId, postId)
      await this.prisma.orm.Bookmark
        .where({ userId, postId })
        .delete();
      return { bookmarked: false, isBookmarked: false, message: 'Bookmark removed successfully' };
    } else {
      await this.prisma.orm.Bookmark.create({ userId, postId });
      return { bookmarked: true, isBookmarked: true, message: 'Post bookmarked successfully' };
    }
  }

  /**
   * Retrieve all bookmarked posts for a user, with optional tag filtering.
   */
  async getBookmarks(userId: number, query: GetBookmarksDto) {
    const limit = query.limit ?? 10;

    const bookmarks = await this.prisma.orm.Bookmark
      .where({ userId })
      .include('post', (post) =>
        post
          .include('author', (author) => author.include('profile'))
          .include('tags', (postTag) => postTag.include('tag')),
      )
      .orderBy((b) => b.createdAt.desc())
      .limit(limit)
      .all();

    const results = bookmarks.flatMap((b) => {
      if (!b.post) return [];
      const post = b.post;
      return [
        {
          bookmarked_at: b.createdAt,
          post: {
            id: post.id,
            content: post.content,
            created_at: post.createdAt,
            author: post.author
              ? {
                  id: post.author.id,
                  email: post.author.email,
                  username: post.author.profile?.username ?? null,
                  avatar: post.author.profile?.profilePictureUrl ?? null,
                }
              : null,
            tags: post.tags?.map((pt) => pt.tag.name) ?? [],
          },
        },
      ];
    });

    if (query.tag) {
      const searchTag = query.tag.toLowerCase();
      return results.filter((item) =>
        item.post.tags.some((tagName) => tagName.toLowerCase() === searchTag),
      );
    }

    return results;
  }
}
