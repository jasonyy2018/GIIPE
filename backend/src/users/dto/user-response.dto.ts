import { UserRole } from '@prisma/client';

export class UserResponseDto {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  firstName?: string;
  lastName?: string;
  organization?: string;
  phone?: string;
  bio?: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
  mustChangePassword?: boolean;
}

export class PaginatedUsersDto {
  users: UserResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}