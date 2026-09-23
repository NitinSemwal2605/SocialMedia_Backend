import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { CreatePostDto } from './dto/create-post.dto.js';
import { UpdatePostDto } from './dto/update-post.dto.js';
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
      `SELECT p.*, u.email as author_email 
       FROM posts p 
       JOIN users u ON p.author_id = u.id 
       ORDER BY p.created_at DESC`
    );
    return result.rows;
  }

  async findOne(id: number) {
    const result = await this.databaseService.query(
      `SELECT p.*, u.email as author_email 
       FROM posts p 
       JOIN users u ON p.author_id = u.id 
       WHERE p.id = $1`,
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
}
