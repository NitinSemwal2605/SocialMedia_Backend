import { Controller, Post, Get, Param, Query, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { BookmarksService } from './bookmarks.service.js';
import { GetBookmarksDto } from './dto/get-bookmarks.dto.js';

@Controller('bookmarks')
@UseGuards(JwtAuthGuard)
export class BookmarksController {
  constructor(private readonly bookmarksService: BookmarksService) {}

  @Post(':postId')
  toggleBookmark(@Param('postId', ParseIntPipe) postId: number, @Request() req: any) {
    return this.bookmarksService.toggleBookmark(req.user.userId, postId);
  }

  @Get()
  getBookmarks(@Request() req: any, @Query() query: GetBookmarksDto) {
    return this.bookmarksService.getBookmarks(req.user.userId, query);
  }
}
