import { IsString, MinLength, IsOptional } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @IsOptional()
  currentPassword?: string; // Optional for forced password changes

  @IsString()
  @MinLength(6)
  newPassword: string;
}