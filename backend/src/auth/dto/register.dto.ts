import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength, IsOptional, Matches } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @IsString({ message: 'Username must be a string' })
  @IsNotEmpty({ message: 'Username is required' })
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  @MaxLength(30, { message: 'Username must not exceed 30 characters' })
  @Matches(/^[a-zA-Z0-9_-]+$/, { message: 'Username can only contain letters, numbers, underscores, and hyphens' })
  username: string;

  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, { 
    message: 'Password must contain at least one lowercase letter, one uppercase letter, and one number' 
  })
  password: string;

  @IsString({ message: 'First name must be a string' })
  @IsOptional()
  @MaxLength(50, { message: 'First name must not exceed 50 characters' })
  firstName?: string;

  @IsString({ message: 'Last name must be a string' })
  @IsOptional()
  @MaxLength(50, { message: 'Last name must not exceed 50 characters' })
  lastName?: string;

  @IsString({ message: 'Organization must be a string' })
  @IsOptional()
  @MaxLength(100, { message: 'Organization must not exceed 100 characters' })
  organization?: string;

  @IsString({ message: 'Phone must be a string' })
  @IsOptional()
  @MaxLength(20, { message: 'Phone must not exceed 20 characters' })
  phone?: string;
}