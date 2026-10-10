import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { SendFriendRequestDto } from './dto/send-friend-request.dto.js';

@Injectable()
export class FriendsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async sendRequest(requesterId: number, addresseeId: number, dto: SendFriendRequestDto) {
    if (requesterId === addresseeId) {
      throw new BadRequestException('You cannot send a friend request to yourself');
    }

    try {
      const result = await this.databaseService.query(
        `INSERT INTO friendships (requester_id, addressee_id, status) 
         VALUES ($1, $2, 'PENDING') RETURNING *`,
        [requesterId, addresseeId]
      );
      return result.rows[0];
    } catch (error: any) {
      if (error.code === '23505') { // unique violation code in postgres
        throw new ConflictException('A friendship or request already exists between these users');
      }
      throw error;
    }
  }

  async acceptRequest(userId: number, requesterId: number) {
    const result = await this.databaseService.query(
      `UPDATE friendships 
       SET status = 'ACCEPTED', updated_at = CURRENT_TIMESTAMP 
       WHERE requester_id = $1 AND addressee_id = $2 AND status = 'PENDING' 
       RETURNING *`,
      [requesterId, userId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Friend request not found or already processed');
    }
    return result.rows[0];
  }

  async rejectRequest(userId: number, requesterId: number) {
    const result = await this.databaseService.query(
      `UPDATE friendships 
       SET status = 'REJECTED', updated_at = CURRENT_TIMESTAMP 
       WHERE requester_id = $1 AND addressee_id = $2 AND status = 'PENDING' 
       RETURNING *`,
      [requesterId, userId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Friend request not found or already processed');
    }
    return result.rows[0];
  }

  async removeFriend(userId: number, friendId: number) {
    const result = await this.databaseService.query(
      `DELETE FROM friendships 
       WHERE (requester_id = $1 AND addressee_id = $2) 
          OR (requester_id = $2 AND addressee_id = $1)
       RETURNING id`,
      [userId, friendId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Friendship not found');
    }
    return { message: 'Friend successfully removed' };
  }

  async getPendingRequests(userId: number) {
    const result = await this.databaseService.query(
      `SELECT f.id, f.requester_id, u.email as requester_email, f.created_at 
       FROM friendships f
       JOIN users u ON f.requester_id = u.id
       WHERE f.addressee_id = $1 AND f.status = 'PENDING'
       ORDER BY f.created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  async getFriends(userId: number) {
    const result = await this.databaseService.query(
      `SELECT f.id, 
              CASE 
                WHEN f.requester_id = $1 THEN f.addressee_id 
                ELSE f.requester_id 
              END AS friend_id,
              u.email as friend_email,
              f.updated_at as friends_since
       FROM friendships f
       JOIN users u ON u.id = (
         CASE 
           WHEN f.requester_id = $1 THEN f.addressee_id 
           ELSE f.requester_id 
         END
       )
       WHERE (f.requester_id = $1 OR f.addressee_id = $1) 
         AND f.status = 'ACCEPTED'
       ORDER BY f.updated_at DESC`,
      [userId]
    );
    return result.rows;
  }
}
