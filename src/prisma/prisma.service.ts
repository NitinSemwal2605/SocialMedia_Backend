import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { db } from './db.js';

@Injectable()
export class PrismaService implements OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  /**
   * The underlying Prisma 8 database client instance.
   */
  readonly client = db;

  /**
   * Shortcut accessor to the public PostgreSQL schema ORM models.
   * e.g., this.prisma.orm.User, this.prisma.orm.Post
   */
  get orm() {
    return this.client.orm.public;
  }

  /**
   * Shortcut accessor to Prisma 8 typed SQL template tag.
   * e.g., await this.prisma.sql`SELECT * FROM users WHERE id = ${id}`
   */
  get sql() {
    return this.client.sql;
  }

  /**
   * Gracefully close the database connection pool on application shutdown.
   */
  async onModuleDestroy() {
    try {
      if (typeof this.client.close === 'function') {
        await this.client.close();
        this.logger.log('Prisma 8 connection pool closed.');
      }
    } catch (error) {
      this.logger.error(
        `Error closing Prisma connection: ${error instanceof Error ? error.message : error}`,
      );
    }
  }
}
