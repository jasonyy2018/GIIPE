import { Injectable, NotFoundException, ConflictException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserFiltersDto } from './dto/user-filters.dto';
import { UserResponseDto, PaginatedUsersDto } from './dto/user-response.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RequestPasswordResetDto, ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    // Check if username or email already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: createUserDto.username },
          { email: createUserDto.email }
        ]
      }
    });

    if (existingUser) {
      if (existingUser.username === createUserDto.username) {
        throw new ConflictException('Username already exists');
      }
      if (existingUser.email === createUserDto.email) {
        throw new ConflictException('Email already exists');
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
        role: createUserDto.role || UserRole.MEMBER,
      },
    });

    return this.excludePassword(user);
  }

  async register(createUserDto: CreateUserDto): Promise<{ user: UserResponseDto; emailVerificationToken: string }> {
    // Check if username or email already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: createUserDto.username },
          { email: createUserDto.email }
        ]
      }
    });

    if (existingUser) {
      if (existingUser.username === createUserDto.username) {
        throw new ConflictException('Username already exists');
      }
      if (existingUser.email === createUserDto.email) {
        throw new ConflictException('Email already exists');
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = await this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
        role: UserRole.MEMBER, // New registrations are always members
        emailVerificationToken,
        emailVerificationExpires,
      },
    });

    return {
      user: this.excludePassword(user),
      emailVerificationToken,
    };
  }

  async findAll(filters: UserFiltersDto): Promise<PaginatedUsersDto> {
    const { search, role, isActive, dateFrom, dateTo, page, limit, sortBy, sortOrder } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    // Date range filtering
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999); // End of day
        where.createdAt.lte = endDate;
      }
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.user.count({ where }),
    ]);

    const usersWithoutPassword = users.map(user => this.excludePassword(user));

    return {
      users: usersWithoutPassword,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.excludePassword(user);
  }

  async findByEmail(email: string): Promise<UserResponseDto | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    return user ? this.excludePassword(user) : null;
  }

  async findByUsername(username: string): Promise<UserResponseDto | null> {
    const user = await this.prisma.user.findUnique({
      where: { username },
    });

    return user ? this.excludePassword(user) : null;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    // Check for conflicts if username or email is being updated
    if (updateUserDto.username || updateUserDto.email) {
      const conflictUser = await this.prisma.user.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            {
              OR: [
                updateUserDto.username ? { username: updateUserDto.username } : {},
                updateUserDto.email ? { email: updateUserDto.email } : {},
              ].filter(condition => Object.keys(condition).length > 0)
            }
          ]
        }
      });

      if (conflictUser) {
        if (conflictUser.username === updateUserDto.username) {
          throw new ConflictException('Username already exists');
        }
        if (conflictUser.email === updateUserDto.email) {
          throw new ConflictException('Email already exists');
        }
      }
    }

    const updateData: any = { ...updateUserDto };

    // Hash password if provided
    if (updateUserDto.password) {
      updateData.password = await bcrypt.hash(updateUserDto.password, 10);
      // If admin is setting a new password, force user to change it on next login
      if (updateUserDto.mustChangePassword !== undefined) {
        updateData.mustChangePassword = updateUserDto.mustChangePassword;
      } else {
        // Default: if password is changed, force password change
        updateData.mustChangePassword = true;
      }
    }

    // Remove password from updateData if not being updated
    if (!updateUserDto.password) {
      delete updateData.password;
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    return this.excludePassword(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.delete({
      where: { id },
    });
  }

  async updateProfile(id: string, profileData: Partial<UpdateUserDto>): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        bio: profileData.bio,
        avatar: profileData.avatar,
        phone: profileData.phone,
        organization: profileData.organization,
      },
    });

    return this.excludePassword(updatedUser);
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto): Promise<UserResponseDto> {
    const { token } = verifyEmailDto;

    const user = await this.prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });

    return this.excludePassword(updatedUser);
  }

  async resendEmailVerification(email: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // Generate new verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken,
        emailVerificationExpires,
      },
    });

    return emailVerificationToken;
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto, forceChange: boolean = false): Promise<void> {
    const { currentPassword, newPassword } = changePasswordDto;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password (unless this is a forced change)
    if (!forceChange && currentPassword) {
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        throw new UnauthorizedException('Current password is incorrect');
      }
    } else if (!forceChange && !currentPassword) {
      throw new UnauthorizedException('Current password is required');
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear mustChangePassword flag
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedNewPassword,
        mustChangePassword: false, // Clear the flag after password change
      },
    });
  }

  async requestPasswordReset(requestPasswordResetDto: RequestPasswordResetDto): Promise<string> {
    const { email } = requestPasswordResetDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if email exists or not for security
      throw new NotFoundException('If the email exists, a password reset link has been sent');
    }

    // Generate password reset token
    const passwordResetToken = crypto.randomBytes(32).toString('hex');
    const passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken,
        passwordResetExpires,
      },
    });

    return passwordResetToken;
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {
    const { token, newPassword } = resetPasswordDto;

    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });
  }

  // Bulk operations
  async bulkUpdateUsers(userIds: string[], updateData: Partial<UpdateUserDto>): Promise<{ success: number; failed: number; errors: any[] }> {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as any[]
    };

    for (const userId of userIds) {
      try {
        await this.update(userId, updateData);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          userId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }

  async bulkDeleteUsers(userIds: string[]): Promise<{ success: number; failed: number; errors: any[] }> {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as any[]
    };

    for (const userId of userIds) {
      try {
        await this.remove(userId);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          userId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }

  // User activity log
  async getUserActivity(userId: string): Promise<any[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get audit logs for this user
    const auditLogs = await this.prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50, // Limit to last 50 activities
    });

    // Transform audit logs to activity format
    const activities = auditLogs.map(log => ({
      id: log.id,
      action: log.action,
      description: log.action,
      timestamp: log.createdAt,
      metadata: log.details
    }));

    // Add some synthetic activities based on user data
    const syntheticActivities = [];

    // Registration activity
    syntheticActivities.push({
      id: `register-${user.id}`,
      action: 'register',
      description: 'Account created',
      timestamp: user.createdAt,
      metadata: {}
    });

    // Email verification if verified
    if (user.emailVerified) {
      syntheticActivities.push({
        id: `email-verified-${user.id}`,
        action: 'email_verified',
        description: 'Email address verified',
        timestamp: user.createdAt, // Use createdAt as emailVerifiedAt doesn't exist
        metadata: {}
      });
    }

    // Last login if available (commented out as lastLoginAt field doesn't exist)
    // if (user.lastLoginAt) {
    //   syntheticActivities.push({
    //     id: `last-login-${user.id}`,
    //     action: 'login',
    //     description: 'Last login',
    //     timestamp: user.lastLoginAt,
    //     metadata: {}
    //   });
    // }

    // Combine and sort all activities
    const allActivities = [...activities, ...syntheticActivities];
    allActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return allActivities.slice(0, 50); // Return top 50 activities
  }

  private excludePassword(user: any): UserResponseDto {
    const { password, emailVerificationToken, passwordResetToken, ...userWithoutSensitiveData } = user;
    return userWithoutSensitiveData;
  }
}