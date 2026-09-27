import { Module } from '@nestjs/common';
import { FriendsService } from './friends.service.js';
import { FriendsController } from './friends.controller.js';
import { DatabaseModule } from '../database/database.module.js';

@Module({
  imports: [DatabaseModule],
  controllers: [FriendsController],
  providers: [FriendsService],
  exports: [FriendsService],
})
export class FriendsModule {}
