import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { GetFeedDto } from './dto/get-feed.dto.js';

export interface FeedAuthor {
  id: number;
  email: string;
  username: string | null;
  full_name: string | null;
  profile_picture_url: string | null;
}

export interface FeedPost {
  id: number;
  content: string;
  created_at: Date | string;
  updated_at: Date | string;
  author: FeedAuthor;
  like_count: number;
  comment_count: number;
  is_liked: boolean;
}

export interface FeedResponse {
  data: FeedPost[];
  pagination: {
    limit: number;
    cursor: number | null;
    next_cursor: number | null;
    has_more: boolean;
  };
}

@Injectable()
export class FeedService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getFeed(userId: number, query: GetFeedDto = new GetFeedDto()): Promise<FeedResponse> {
    const cursor = query.cursor ?? query.last_id;
    const limit = query.limit ? Number(query.limit) : 10;
    const includeSelf = Boolean(query.include_self);

    // Fetch limit + 1 to reliably determine if there is a next page
    const fetchLimit = limit + 1;
    const params: any[] = [userId];
    let paramIndex = 2;

    let cursorCondition = '';
    if (cursor) {
      cursorCondition = `AND p.id < $${paramIndex}`;
      params.push(cursor);
      paramIndex++;
    }

    params.push(fetchLimit);
    const limitPlaceholder = `$${paramIndex}`;

    // Join with followers table:
    // If includeSelf is true, include posts authored by users the caller follows OR the caller's own posts
    // Otherwise, strictly posts authored by users the caller follows
    const joinFollowers = includeSelf
      ? `LEFT JOIN followers f ON p.author_id = f.following_id AND f.follower_id = $1`
      : `JOIN followers f ON p.author_id = f.following_id AND f.follower_id = $1`;

    const whereClause = includeSelf
      ? `WHERE (f.follower_id IS NOT NULL OR p.author_id = $1) ${cursorCondition}`
      : `WHERE f.follower_id = $1 ${cursorCondition}`;

    const sql = `
      SELECT 
        p.id,
        p.content,
        p.created_at,
        p.updated_at,
        u.id AS author_id,
        u.email AS author_email,
        pr.username AS author_username,
        pr.full_name AS author_full_name,
        pr.profile_picture_url AS author_profile_picture_url,
        COUNT(DISTINCT pl.user_id)::int AS like_count,
        COUNT(DISTINCT pc.id)::int AS comment_count,
        COALESCE(BOOL_OR(pl.user_id = $1), false) AS is_liked
      FROM posts p
      ${joinFollowers}
      JOIN users u ON p.author_id = u.id
      LEFT JOIN user_profiles pr ON u.id = pr.user_id
      LEFT JOIN post_likes pl ON p.id = pl.post_id
      LEFT JOIN post_comments pc ON p.id = pc.post_id
      ${whereClause}
      GROUP BY p.id, u.id, pr.id
      ORDER BY p.id DESC
      LIMIT ${limitPlaceholder};
    `;

    const result = await this.databaseService.query(sql, params);
    const rows = result.rows;

    const hasMore = rows.length > limit;
    const dataRows = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = dataRows.length > 0 && hasMore ? dataRows[dataRows.length - 1].id : null;

    const data: FeedPost[] = dataRows.map((row) => ({
      id: row.id,
      content: row.content,
      created_at: row.created_at,
      updated_at: row.updated_at,
      author: {
        id: row.author_id,
        email: row.author_email,
        username: row.author_username,
        full_name: row.author_full_name,
        profile_picture_url: row.author_profile_picture_url,
      },
      like_count: row.like_count,
      comment_count: row.comment_count,
      is_liked: Boolean(row.is_liked),
    }));

    return {
      data,
      pagination: {
        limit,
        cursor: cursor ?? null,
        next_cursor: nextCursor,
        has_more: hasMore,
      },
    };
  }
}
