import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { FeedService } from './feed.service.js';
import { GetFeedDto } from './dto/get-feed.dto.js';

@Controller('feed')
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  getFeed(@Request() req: any, @Query() query: GetFeedDto) {
    return this.feedService.getFeed(req.user.userId, query);
  }
}
