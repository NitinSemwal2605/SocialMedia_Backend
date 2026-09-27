import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SendFriendRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  message?: string;
}
