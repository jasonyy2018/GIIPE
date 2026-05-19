import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserFiltersDto } from './dto/user-filters.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RequestPasswordResetDto, ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole } from '@prisma/client';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  findAll(@Query() filters: UserFiltersDto) {
    return this.usersService.findAll(filters);
  }

  @Get('profile')
  getProfile(@CurrentUser() user: any) {
    return this.usersService.findOne(user.id);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch('profile')
  updateProfile(
    @CurrentUser() user: any,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.updateProfile(user.id, updateUserDto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  // Public registration endpoint
  @Post('register')
  @Public()
  async register(@Body() createUserDto: CreateUserDto) {
    const result = await this.usersService.register(createUserDto);
    // In a real application, you would send an email here
    // For now, we'll return the token for testing purposes
    return {
      message: 'Registration successful. Please check your email to verify your account.',
      user: result.user,
      // Remove this in production - only for testing
      emailVerificationToken: result.emailVerificationToken,
    };
  }

  // Email verification
  @Post('verify-email')
  @Public()
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    const user = await this.usersService.verifyEmail(verifyEmailDto);
    return {
      message: 'Email verified successfully',
      user,
    };
  }

  @Post('resend-verification')
  @Public()
  @HttpCode(HttpStatus.OK)
  async resendEmailVerification(@Body() body: { email: string }) {
    const token = await this.usersService.resendEmailVerification(body.email);
    // In a real application, you would send an email here
    return {
      message: 'Verification email sent',
      // Remove this in production - only for testing
      emailVerificationToken: token,
    };
  }

  // Password management
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() user: any,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    // Check if this is a forced password change
    const forceChange = user.mustChangePassword === true;
    await this.usersService.changePassword(user.id, changePasswordDto, forceChange);
    return { message: 'Password changed successfully' };
  }
  
  // Force password change endpoint (for users who must change password)
  @Post('force-change-password')
  @HttpCode(HttpStatus.OK)
  async forceChangePassword(
    @CurrentUser() user: any,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    if (!user.mustChangePassword) {
      throw new BadRequestException('Password change is not required');
    }
    await this.usersService.changePassword(user.id, changePasswordDto, true);
    return { message: 'Password changed successfully' };
  }

  @Post('request-password-reset')
  @Public()
  @HttpCode(HttpStatus.OK)
  async requestPasswordReset(@Body() requestPasswordResetDto: RequestPasswordResetDto) {
    const token = await this.usersService.requestPasswordReset(requestPasswordResetDto);
    // In a real application, you would send an email here
    return {
      message: 'If the email exists, a password reset link has been sent',
      // Remove this in production - only for testing
      passwordResetToken: token,
    };
  }

  @Post('reset-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    await this.usersService.resetPassword(resetPasswordDto);
    return { message: 'Password reset successfully' };
  }

  // Bulk operations
  @Post('bulk/activate')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async bulkActivateUsers(@Body() body: { userIds: string[] }) {
    return this.usersService.bulkUpdateUsers(body.userIds, { isActive: true });
  }

  @Post('bulk/deactivate')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async bulkDeactivateUsers(@Body() body: { userIds: string[] }) {
    return this.usersService.bulkUpdateUsers(body.userIds, { isActive: false });
  }

  @Post('bulk/change-role')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async bulkChangeRole(@Body() body: { userIds: string[]; role: UserRole }) {
    return this.usersService.bulkUpdateUsers(body.userIds, { role: body.role });
  }

  @Delete('bulk')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async bulkDeleteUsers(@Body() body: { userIds: string[] }) {
    return this.usersService.bulkDeleteUsers(body.userIds);
  }

  // User activity log
  @Get(':id/activity')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  async getUserActivity(@Param('id') id: string) {
    return this.usersService.getUserActivity(id);
  }
}