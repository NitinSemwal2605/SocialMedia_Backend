import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { CreatePostDto } from './dto/create-post.dto.js';
import { UpdatePostDto } from './dto/update-post.dto.js';
import { CreateCommentDto } from './dto/create-comment.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createPostDto: CreatePostDto, authorId: number) {
    const { content } = createPostDto;
    const post = await this.prisma.orm.Post.create({
      authorId,
      content,
    });
    return {
      id: post.id,
      author_id: post.authorId,
      content: post.content,
      created_at: post.createdAt,
      updated_at: post.updatedAt,
    };
  }

  async findAll() {
    const posts = await this.prisma.orm.Post
      .include('author')
      .include('likes', (l) => l.count())
      .orderBy((p) => p.createdAt.desc())
      .all();

    return posts.map((p) => ({
      id: p.id,
      author_id: p.authorId,
      content: p.content,
      created_at: p.createdAt,
      updated_at: p.updatedAt,
      author_email: p.author.email,
      like_count: p.likes,
    }));
  }

  async findOne(id: number) {
    const post = await this.prisma.orm.Post
      .where({ id })
      .include('author')
      .include('likes', (l) => l.count())
      .first();

    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }

    return {
      id: post.id,
      author_id: post.authorId,
      content: post.content,
      created_at: post.createdAt,
      updated_at: post.updatedAt,
      author_email: post.author.email,
      like_count: post.likes,
    };
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

    const updated = await this.prisma.orm.Post
      .where({ id })
      .update({ content });

    if (!updated) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }

    return {
      id: updated.id,
      author_id: updated.authorId,
      content: updated.content,
      created_at: updated.createdAt,
      updated_at: updated.updatedAt,
    };
  }

  async remove(id: number, authorId: number) {
    const post = await this.findOne(id);

    if (post.author_id !== authorId) {
      throw new UnauthorizedException('You can only delete your own posts');
    }

    await this.prisma.orm.Post.where({ id }).delete();

    return { message: `Post with ID ${id} successfully deleted` };
  }

  async toggleLike(postId: number, userId: number) {
    const post = await this.findOne(postId);

    return this.prisma.client.transaction(async (tx) => {
      const existingLike = await tx.orm.public.PostLike
        .where({ postId, userId })
        .first();

      if (existingLike) {
        await tx.orm.public.PostLike
          .where({ postId, userId })
          .delete();
        return { message: 'Post unliked successfully' };
      } else {
        await tx.orm.public.PostLike.create({
          postId,
          userId,
        });

        if (post.author_id !== userId) {
          await tx.orm.public.Notification.create({
            recipientId: post.author_id,
            actorId: userId,
            type: 'LIKE',
            postId,
            isRead: false,
          });
        }

        return { message: 'Post liked successfully' };
      }
    });
  }

  async addComment(postId: number, userId: number, createCommentDto: CreateCommentDto) {
    const post = await this.findOne(postId);

    const { content } = createCommentDto;

    return this.prisma.client.transaction(async (tx) => {
      const comment = await tx.orm.public.PostComment.create({
        postId,
        authorId: userId,
        content,
      });

      if (post.author_id !== userId) {
        await tx.orm.public.Notification.create({
          recipientId: post.author_id,
          actorId: userId,
          type: 'COMMENT',
          postId,
          isRead: false,
        });
      }

      return {
        id: comment.id,
        post_id: comment.postId,
        author_id: comment.authorId,
        content: comment.content,
        created_at: comment.createdAt,
        updated_at: comment.updatedAt,
      };
    });
  }

  async getComments(postId: number) {
    await this.findOne(postId);

    const comments = await this.prisma.orm.PostComment
      .where({ postId })
      .include('author')
      .orderBy((c) => c.createdAt.asc())
      .all();

    return comments.map((c) => ({
      id: c.id,
      post_id: c.postId,
      author_id: c.authorId,
      content: c.content,
      created_at: c.createdAt,
      updated_at: c.updatedAt,
      author_email: c.author.email,
    }));
  }
}
