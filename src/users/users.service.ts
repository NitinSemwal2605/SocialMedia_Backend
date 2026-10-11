import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { DatabaseService } from '../database/database.service.js';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(createUserDto: CreateUserDto) {
    const { email, password } = createUserDto;
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await this.databaseService.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, role, created_at',
      [email, hashedPassword]
    );
    return result.rows[0];
  }

  async findAll() {
    const result = await this.databaseService.query(
      'SELECT id, email, role, created_at FROM users'
    );
    return result.rows;
  }

  async findOne(id: number) {
    const result = await this.databaseService.query(
      'SELECT id, email, role, created_at FROM users WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return result.rows[0];
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    // Basic dynamic update query generation for demonstration
    const fields = [];
    const values = [];
    let counter = 1;

    if (updateUserDto.email) {
      fields.push(`email = $${counter++}`);
      values.push(updateUserDto.email);
    }
    if (updateUserDto.password) {
      fields.push(`password_hash = $${counter++}`);
      values.push(await bcrypt.hash(updateUserDto.password, 10));
    }

    if (fields.length === 0) {
      return this.findOne(id);
    }

    values.push(id);
    const query = `UPDATE users SET ${fields.join(', ')} WHERE id = $${counter} RETURNING id, email, role, created_at`;
    
    const result = await this.databaseService.query(query, values);
    if (result.rows.length === 0) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return result.rows[0];
  }

  async remove(id: number) {
    const result = await this.databaseService.query(
      'DELETE FROM users WHERE id = $1 RETURNING id',
      [id]
    );
    if (result.rows.length === 0) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return { message: `User with ID ${id} successfully deleted` };
  }

  async getProfile(userId: number) {
    const result = await this.databaseService.query(
      `SELECT u.id as user_id, u.email, u.role, 
              p.username, p.full_name, p.bio, p.profile_picture_url, 
              p.location, p.website, p.updated_at
       FROM users u
       LEFT JOIN user_profiles p ON u.id = p.user_id
       WHERE u.id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return result.rows[0];
  }

  async upsertProfile(userId: number, updateProfileDto: UpdateProfileDto) {
    // Check if user exists
    await this.findOne(userId);

    const { username, full_name, bio, profile_picture_url, location, website } = updateProfileDto;

    const result = await this.databaseService.query(
      `INSERT INTO user_profiles (user_id, username, full_name, bio, profile_picture_url, location, website)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id) DO UPDATE SET
         username = EXCLUDED.username,
         full_name = EXCLUDED.full_name,
         bio = EXCLUDED.bio,
         profile_picture_url = EXCLUDED.profile_picture_url,
         location = EXCLUDED.location,
         website = EXCLUDED.website,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [userId, username, full_name, bio, profile_picture_url, location, website]
    );

    return result.rows[0];
  }

  async toggleFollow(followerId: number, followingId: number) {
    // Check if the user is trying to follow themselves
    if (followerId === followingId) {
      throw new Error("You cannot follow yourself");
    }

    await this.findOne(followingId); // Ensure the user to follow exists

    const checkResult = await this.databaseService.query(
      'SELECT * FROM followers WHERE follower_id = $1 AND following_id = $2',
      [followerId, followingId]
    );

    // Check if the follower relationship already exists
    if (checkResult.rows.length > 0) {
      // If already following, unfollow by removing the record
      await this.databaseService.query(
        'DELETE FROM followers WHERE follower_id = $1 AND following_id = $2',
        [followerId, followingId]
      );
      return { message: `Successfully unfollowed user ${followingId}` };
    } else {
      // If not following, follow by inserting a new record
      await this.databaseService.query(
        'INSERT INTO followers (follower_id, following_id) VALUES ($1, $2)',
        [followerId, followingId]
      );
      return { message: `Successfully followed user ${followingId}` };
    }
  }

  async getFollowers(userId: number) {
    await this.findOne(userId);

    const result = await this.databaseService.query(
      `SELECT u.id, u.email, p.username, p.full_name, p.profile_picture_url
       FROM followers f
       JOIN users u ON f.follower_id = u.id
       LEFT JOIN user_profiles p ON u.id = p.user_id
       WHERE f.following_id = $1
       ORDER BY f.created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  async getFollowing(userId: number) {
    await this.findOne(userId);

    const result = await this.databaseService.query(
      `SELECT u.id, u.email, p.username, p.full_name, p.profile_picture_url
       FROM followers f
       JOIN users u ON f.following_id = u.id
       LEFT JOIN user_profiles p ON u.id = p.user_id
       WHERE f.follower_id = $1
       ORDER BY f.created_at DESC`,
      [userId]
    );
    return result.rows;
  }
}
