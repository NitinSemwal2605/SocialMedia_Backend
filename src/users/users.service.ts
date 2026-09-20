import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
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
}
