import { IsNotEmpty, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { RegisterDto } from './register.dto.js';

export class RegisterAdminDto extends RegisterDto {
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  secretCode: string;
}
