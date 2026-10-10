import { IsString, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreatePostDto {
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  content: string;
}
