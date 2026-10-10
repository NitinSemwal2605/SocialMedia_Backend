import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { CreatePostDto } from './dto/create-post.dto.js';
import { UpdatePostDto } from './dto/update-post.dto.js';
import { CreateCommentDto } from './dto/create-comment.dto.js';
import { DatabaseService } from '../database/database.service.js';

@Injectable()
export class PostsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(createPostDto: CreatePostDto, authorId: number) {
    const { content } = createPostDto;
    const result = await this.databaseService.query(
      'INSERT INTO posts (author_id, content) VALUES ($1, $2) RETURNING *',
      [authorId, content]
    );
    return result.rows[0];
  }

  async findAll() {
    const result = await this.databaseService.query(
      `SELECT p.*, u.email as author_email, COUNT(pl.user_id)::int as like_count 
       FROM posts p 
       JOIN users u ON p.author_id = u.id 
       LEFT JOIN post_likes pl ON p.id = pl.post_id
       GROUP BY p.id, u.email
       ORDER BY p.created_at DESC`
    );
    return result.rows;
  }

  async findOne(id: number) {
    const result = await this.databaseService.query(
      `SELECT p.*, u.email as author_email, COUNT(pl.user_id)::int as like_count 
       FROM posts p 
       JOIN users u ON p.author_id = u.id 
       LEFT JOIN post_likes pl ON p.id = pl.post_id
       WHERE p.id = $1
       GROUP BY p.id, u.email`,
      [id]
    );
    
    if (result.rows.length === 0) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }
    return result.rows[0];
  }

  async update(id: number, updatePostDto: UpdatePostDto, authorId: number) {
    const post = await this.findOne(id);
    
    if (post.author_id !== authorId) {
      throw new UnauthorizedException('You can only update your own posts');
    }

    const { content } = updatePostDto;
    
    if (!content) {
      return post;
    }

    const result = await this.databaseService.query(
      'UPDATE posts SET content = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [content, id]
    );

    return result.rows[0];
  }

  async remove(id: number, authorId: number) {
    const post = await this.findOne(id);
    
    if (post.author_id !== authorId) {
      throw new UnauthorizedException('You can only delete your own posts');
    }

    await this.databaseService.query('DELETE FROM posts WHERE id = $1', [id]);
    
    return { message: `Post with ID ${id} successfully deleted` };
  }

  async toggleLike(postId: number, userId: number) {
    // Check if post exists, findOne will throw NotFoundException if not
    await this.findOne(postId);
    
    const checkResult = await this.databaseService.query(
      'SELECT * FROM post_likes WHERE post_id = $1 AND user_id = $2',
      [postId, userId]
    );

    if (checkResult.rows.length > 0) {
      await this.databaseService.query(
        'DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2',
        [postId, userId]
      );
      return { message: 'Post unliked successfully' };
    } else {
      await this.databaseService.query(
        'INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2)',
        [postId, userId]
      );
      return { message: 'Post liked successfully' };
    }
  }

  async addComment(postId: number, userId: number, createCommentDto: CreateCommentDto) {
    await this.findOne(postId);
    
    const { content } = createCommentDto;
    const result = await this.databaseService.query(
      'INSERT INTO post_comments (post_id, author_id, content) VALUES ($1, $2, $3) RETURNING *',
      [postId, userId, content]
    );
    
    return result.rows[0];
  }

  async getComments(postId: number) {
    await this.findOne(postId);

    const result = await this.databaseService.query(
      `SELECT c.*, u.email as author_email
       FROM post_comments c
       JOIN users u ON c.author_id = u.id
       WHERE c.post_id = $1
       ORDER BY c.created_at ASC`,
      [postId]
    );

    return result.rows;
  } 
}
