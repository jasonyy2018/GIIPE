import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import {
  AnalyticsQueryDto,
  UserActivityDto,
  DashboardMetrics,
  UserActivityMetrics,
  EventMetrics,
  RegistrationMetrics,
  SystemMetrics,
} from './dto/analytics.dto';

@ApiTags('analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('track-activity')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Track user activity for analytics' })
  @ApiResponse({ status: 204, description: 'Activity tracked successfully' })
  async trackActivity(@Body() activityData: UserActivityDto): Promise<void> {
    await this.analyticsService.trackUserActivity(activityData);
  }

  @Get('dashboard')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Get dashboard metrics' })
  @ApiResponse({ status: 200, description: 'Dashboard metrics retrieved successfully' })
  async getDashboardMetrics(
    @Query() query: AnalyticsQueryDto,
  ): Promise<DashboardMetrics> {
    return this.analyticsService.getDashboardMetrics(query);
  }

  @Get('user-activity')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get user activity metrics' })
  @ApiResponse({ status: 200, description: 'User activity metrics retrieved successfully' })
  async getUserActivityMetrics(
    @Query() query: AnalyticsQueryDto,
  ): Promise<UserActivityMetrics> {
    return this.analyticsService.getUserActivityMetrics(query);
  }

  @Get('events')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Get event metrics' })
  @ApiResponse({ status: 200, description: 'Event metrics retrieved successfully' })
  async getEventMetrics(
    @Query() query: AnalyticsQueryDto,
  ): Promise<EventMetrics> {
    return this.analyticsService.getEventMetrics(query);
  }

  @Get('registrations')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Get registration metrics' })
  @ApiResponse({ status: 200, description: 'Registration metrics retrieved successfully' })
  async getRegistrationMetrics(
    @Query() query: AnalyticsQueryDto,
  ): Promise<RegistrationMetrics> {
    return this.analyticsService.getRegistrationMetrics(query);
  }

  @Get('system')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get system metrics' })
  @ApiResponse({ status: 200, description: 'System metrics retrieved successfully' })
  async getSystemMetrics(): Promise<SystemMetrics> {
    return this.analyticsService.getSystemMetrics();
  }

  @Get('export')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Export analytics data for reporting' })
  @ApiResponse({ status: 200, description: 'Analytics data exported successfully' })
  async exportAnalyticsData(@Query() query: AnalyticsQueryDto): Promise<any> {
    return this.analyticsService.exportAnalyticsData(query);
  }
}