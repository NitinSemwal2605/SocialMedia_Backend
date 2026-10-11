import { Injectable, OnModuleDestroy, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import pg from 'pg';
import { db } from './db.js';

const { Pool } = pg;

@Injectable()
export class PrismaService implements OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private pool: pg.Pool;

  /**
   * The underlying Prisma 8 database client instance.
   */
  readonly client = db;

  constructor(@Optional() private configService?: ConfigService) {
    const connectionString =
      this.configService?.get<string>('DATABASE_URL') || process.env['DATABASE_URL'];
    this.pool = new Pool({
      connectionString,
    });
  }

  /**
   * Shortcut accessor to the public PostgreSQL schema ORM models.
   * e.g., this.prisma.orm.User, this.prisma.orm.Post, this.prisma.orm.Follower
   */
  get orm() {
    return this.client.orm.public;
  }

  /**
   * Shortcut accessor to Prisma 8 table-level SQL builder.
   * e.g., this.prisma.sql.posts, this.prisma.sql.users
   */
  get sql() {
    return this.client.sql.public;
  }

  /**
   * Raw SQL query executor with parameter bindings.
   * Useful for dynamic queries and complex joins.
   */
  async query(queryText: string, values?: any[]) {
    return this.pool.query(queryText, values);
  }

  /**
   * Gracefully close connections on application shutdown.
   */
  async onModuleDestroy() {
    try {
      await this.pool.end();
      if (typeof this.client.close === 'function') {
        await this.client.close();
      }
      this.logger.log('Prisma 8 database connection pool closed.');
    } catch (error) {
      this.logger.error(
        `Error closing Prisma connection: ${error instanceof Error ? error.message : error}`,
      );
    }
  }
}
