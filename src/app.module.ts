import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseModule } from './database/database.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { UsersModule } from './users/users.module.js';
import { AuthModule } from './auth/auth.module.js';
import { PostsModule } from './posts/posts.module.js';
import { FeedModule } from './feed/feed.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // This is a module that will be registered with the application.
    PrismaModule,
    DatabaseModule,
    UsersModule,
    AuthModule,
    PostsModule,
    FeedModule,
  ],
  controllers: [AppController], // This is an array of controllers that will be registered with the application.
  providers: [AppService], // This is an array of providers that will be registered with the application.
})
export class AppModule {}
