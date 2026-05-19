import { User } from '@prisma/client';

export class AuthResponseDto {
  user: Omit<User, 'password'>;
  accessToken: string;
  refreshToken: string;
}

export class LoginResponseDto extends AuthResponseDto {}

export class RegisterResponseDto extends AuthResponseDto {}

export class RefreshResponseDto extends AuthResponseDto {}

export class LogoutResponseDto {
  message: string;
}

export class ProfileResponseDto {
  user: Omit<User, 'password'>;
}

export class VerifyTokenResponseDto {
  valid: boolean;
  user: Omit<User, 'password'>;
}