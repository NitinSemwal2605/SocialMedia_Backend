import { Controller, Post, Patch, Delete, Get, Param, Body, UseGuards, Request } from '@nestjs/common';
import { FriendsService } from './friends.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { SendFriendRequestDto } from './dto/send-friend-request.dto.js';

@UseGuards(JwtAuthGuard)
@Controller('friends')
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Post('request/:userId')
  sendRequest(@Param('userId') addresseeId: string, @Body() dto: SendFriendRequestDto, @Request() req: any) {
    return this.friendsService.sendRequest(req.user.userId, +addresseeId, dto);
  }

  @Patch('accept/:userId')
  acceptRequest(@Param('userId') requesterId: string, @Request() req: any) {
    return this.friendsService.acceptRequest(req.user.userId, +requesterId);
  }

  @Patch('reject/:userId')
  rejectRequest(@Param('userId') requesterId: string, @Request() req: any) {
    return this.friendsService.rejectRequest(req.user.userId, +requesterId);
  }

  @Delete('remove/:userId')
  removeFriend(@Param('userId') friendId: string, @Request() req: any) {
    return this.friendsService.removeFriend(req.user.userId, +friendId);
  }

  @Get('requests')
  getPendingRequests(@Request() req: any) {
    return this.friendsService.getPendingRequests(req.user.userId);
  }

  @Get()
  getFriends(@Request() req: any) {
    return this.friendsService.getFriends(req.user.userId);
  }
}
