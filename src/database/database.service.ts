import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import pg from 'pg';
import { ConfigService } from '@nestjs/config';

const { Pool } = pg;

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool;

  constructor(private configService: ConfigService) {
    this.pool = new Pool({
      connectionString: this.configService.get<string>('DATABASE_URL'),
    });
  }

  async onModuleInit() {
    await this.pool.connect();
    console.log('Connected to PostgreSQL Database');
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  async query(queryText: string, values?: any[]) {
    return this.pool.query(queryText, values);
  }
}
