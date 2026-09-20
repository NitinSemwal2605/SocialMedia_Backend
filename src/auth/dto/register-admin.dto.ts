import { IsNotEmpty, IsString } from 'class-validator';
import { RegisterDto } from './register.dto.js';

export class RegisterAdminDto extends RegisterDto {
  @IsString()
  @IsNotEmpty()
  secretCode: string;
}
