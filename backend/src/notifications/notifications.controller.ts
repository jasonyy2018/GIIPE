import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { EmailTemplateService } from './email-template.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { CreateEmailTemplateDto, UpdateEmailTemplateDto } from './dto/email-template.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly emailTemplateService: EmailTemplateService,
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Create a new notification' })
  @ApiResponse({ status: 201, description: 'Notification created successfully' })
  async create(@Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationsService.createNotification(createNotificationDto);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Get all notifications' })
  @ApiResponse({ status: 200, description: 'List of notifications' })
  async findAll(@Query('userId') userId?: string) {
    return this.notificationsService.findAll(userId);
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get notification statistics' })
  @ApiResponse({ status: 200, description: 'Notification statistics' })
  async getStats() {
    return this.notificationsService.getNotificationStats();
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Get notification by ID' })
  @ApiResponse({ status: 200, description: 'Notification details' })
  async findOne(@Param('id') id: string) {
    return this.notificationsService.findOne(id);
  }

  // Email Template Management
  @Post('templates')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create email template' })
  @ApiResponse({ status: 201, description: 'Email template created successfully' })
  async createTemplate(@Body() createTemplateDto: CreateEmailTemplateDto) {
    return this.emailTemplateService.createTemplate(createTemplateDto);
  }

  @Get('templates')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Get all email templates' })
  @ApiResponse({ status: 200, description: 'List of email templates' })
  async findAllTemplates() {
    return this.emailTemplateService.findAll();
  }

  @Get('templates/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Get email template by ID' })
  @ApiResponse({ status: 200, description: 'Email template details' })
  async findOneTemplate(@Param('id') id: string) {
    return this.emailTemplateService.findOne(id);
  }

  @Put('templates/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update email template' })
  @ApiResponse({ status: 200, description: 'Email template updated successfully' })
  async updateTemplate(
    @Param('id') id: string,
    @Body() updateTemplateDto: UpdateEmailTemplateDto,
  ) {
    return this.emailTemplateService.updateTemplate(id, updateTemplateDto);
  }

  @Delete('templates/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete email template' })
  @ApiResponse({ status: 200, description: 'Email template deleted successfully' })
  async deleteTemplate(@Param('id') id: string) {
    return this.emailTemplateService.deleteTemplate(id);
  }

  @Post('templates/:name/preview')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Preview email template with variables' })
  @ApiResponse({ status: 200, description: 'Rendered email template' })
  async previewTemplate(
    @Param('name') name: string,
    @Body() variables: Record<string, any>,
  ) {
    return this.emailTemplateService.renderTemplate(name, variables);
  }

  @Post('templates/seed')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Seed default email templates' })
  @ApiResponse({ status: 200, description: 'Default templates seeded successfully' })
  async seedTemplates() {
    await this.emailTemplateService.seedDefaultTemplates();
    return { message: 'Default email templates seeded successfully' };
  }
}