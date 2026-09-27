import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto { // DTO Means Data Transfer Object (What data is expected ? )
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
