import { IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class SendFriendRequestDto {
  @Transform(({ value }) => value?.trim())
  @IsOptional()
  @IsString()
  @MaxLength(255)
  message?: string;
}
