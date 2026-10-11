import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const { email, password } = createUserDto;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.prisma.orm.User
      .select('id', 'email', 'role', 'createdAt')
      .create({
        email,
        passwordHash: hashedPassword,
        role: 'USER',
      } as any);

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      created_at: user.createdAt,
    };
  }

  async findAll() {
    const users = await this.prisma.orm.User
      .select('id', 'email', 'role', 'createdAt')
      .all();

    return users.map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      created_at: u.createdAt,
    }));
  }

  async findOne(id: number) {
    const user = await this.prisma.orm.User
      .where({ id })
      .select('id', 'email', 'role', 'createdAt')
      .first();

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      created_at: user.createdAt,
    };
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    await this.findOne(id);

    const updateData: Record<string, any> = {};
    if (updateUserDto.email) {
      updateData['email'] = updateUserDto.email;
    }
    if (updateUserDto.password) {
      updateData['passwordHash'] = await bcrypt.hash(updateUserDto.password, 10);
    }

    if (Object.keys(updateData).length === 0) {
      return this.findOne(id);
    }

    const updated = await this.prisma.orm.User
      .where({ id })
      .select('id', 'email', 'role', 'createdAt')
      .update(updateData as any);

    if (!updated) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return {
      id: updated.id,
      email: updated.email,
      role: updated.role,
      created_at: updated.createdAt,
    };
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.orm.User.where({ id }).delete();
    return { message: `User with ID ${id} successfully deleted` };
  }

  async getProfile(userId: number) {
    const user = await this.prisma.orm.User
      .where({ id: userId })
      .include('profile')
      .first();

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const profile = user.profile;
    return {
      user_id: user.id,
      email: user.email,
      role: user.role,
      username: profile?.username ?? null,
      full_name: profile?.fullName ?? null,
      bio: profile?.bio ?? null,
      profile_picture_url: profile?.profilePictureUrl ?? null,
      location: profile?.location ?? null,
      website: profile?.website ?? null,
      updated_at: profile?.updatedAt ?? null,
    };
  }

  async upsertProfile(userId: number, updateProfileDto: UpdateProfileDto) {
    // Ensure user exists
    await this.findOne(userId);

    const { username, full_name, bio, profile_picture_url, location, website } = updateProfileDto;

    const existingProfile = await this.prisma.orm.UserProfile
      .where({ userId })
      .first();

    let profile;
    if (existingProfile) {
      profile = await this.prisma.orm.UserProfile
        .where({ userId })
        .update({
          ...(username !== undefined && { username }),
          ...(full_name !== undefined && { fullName: full_name }),
          ...(bio !== undefined && { bio }),
          ...(profile_picture_url !== undefined && { profilePictureUrl: profile_picture_url }),
          ...(location !== undefined && { location }),
          ...(website !== undefined && { website }),
        } as any);
    } else {
      profile = await this.prisma.orm.UserProfile.create({
        userId,
        username: username ?? null,
        fullName: full_name ?? null,
        bio: bio ?? null,
        profilePictureUrl: profile_picture_url ?? null,
        location: location ?? null,
        website: website ?? null,
      } as any);
    }

    if (!profile) {
      throw new NotFoundException(`Profile for user ${userId} could not be updated`);
    }

    return {
      id: profile.id,
      user_id: profile.userId,
      username: profile.username,
      full_name: profile.fullName,
      bio: profile.bio,
      profile_picture_url: profile.profilePictureUrl,
      location: profile.location,
      website: profile.website,
      updated_at: profile.updatedAt,
    };
  }

  async toggleFollow(followerId: number, followingId: number) {
    if (followerId === followingId) {
      throw new Error('You cannot follow yourself');
    }

    await this.findOne(followingId);

    const existingFollow = await this.prisma.orm.Follower
      .where({ followerId, followingId })
      .first();

    if (existingFollow) {
      await this.prisma.orm.Follower
        .where({ followerId, followingId })
        .delete();
      return { message: `Successfully unfollowed user ${followingId}` };
    } else {
      await this.prisma.orm.Follower.create({
        followerId,
        followingId,
      });
      return { message: `Successfully followed user ${followingId}` };
    }
  }

  async getFollowers(userId: number) {
    await this.findOne(userId);

    const followers = await this.prisma.orm.Follower
      .where({ followingId: userId })
      .include('follower', (f) => f.include('profile'))
      .orderBy((f) => f.createdAt.desc())
      .all();

    return followers
      .filter((f) => f.follower !== null && f.follower !== undefined)
      .map((f) => ({
        id: f.follower!.id,
        email: f.follower!.email,
        username: f.follower!.profile?.username ?? null,
        full_name: f.follower!.profile?.fullName ?? null,
        profile_picture_url: f.follower!.profile?.profilePictureUrl ?? null,
      }));
  }

  async getFollowing(userId: number) {
    await this.findOne(userId);

    const followings = await this.prisma.orm.Follower
      .where({ followerId: userId })
      .include('following', (f) => f.include('profile'))
      .orderBy((f) => f.createdAt.desc())
      .all();

    return followings
      .filter((f) => f.following !== null && f.following !== undefined)
      .map((f) => ({
        id: f.following!.id,
        email: f.following!.email,
        username: f.following!.profile?.username ?? null,
        full_name: f.following!.profile?.fullName ?? null,
        profile_picture_url: f.following!.profile?.profilePictureUrl ?? null,
      }));
  }
}
