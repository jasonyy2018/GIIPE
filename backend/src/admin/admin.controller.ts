import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService, DashboardMetrics } from './admin.service';
import { ModerationService } from './services/moderation.service';
import { AdminEventsService } from './services/admin-events.service';
import { SecurityAlertService } from './services/security-alert.service';
// import { SecurityMonitoringService } from './services/security-monitoring.service';
// import { AuditLogRotationService } from './services/audit-log-rotation.service'; // Temporarily disabled
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, CommentStatus } from '@prisma/client';
import { CreateSystemSettingDto, UpdateSystemSettingDto, SystemInfoDto } from './dto/system-settings.dto';
import { CreateAuditLogDto, AuditLogFiltersDto, AuditLogExportDto, AuditLogAnalyticsDto } from './dto/audit-logs.dto';
import { 
  ModerationQueueFiltersDto, 
  BulkModerationDto, 
  ModerationQueueResponseDto,
  ModerationStatsDto 
} from './dto/moderation-queue.dto';
import { 
  AdminCreateEventDto, 
  AdminUpdateEventDto, 
  AdminEventFiltersDto, 
  DuplicateEventDto, 
  EventWorkflowDto, 
  BulkEventActionDto 
} from './dto/admin-event.dto';
import { EventResponseDto, PaginatedEventsDto } from '../events/dto/event-response.dto';
import {
  CreateSecurityAlertDto,
  AcknowledgeAlertDto,
  ResolveAlertDto,
  SecurityAlertFiltersDto,
  CreateAlertRuleDto,
  UpdateAlertRuleDto,
  CreateNotificationChannelDto,
  UpdateNotificationChannelDto,
  TestNotificationChannelDto,
  SecurityAlertMetricsDto,
  SecurityAlertResponseDto,
  PaginatedSecurityAlertsDto
} from './dto/security-alert.dto';
import {
  CreateNotificationDto,
  GetNotificationsDto,
  MarkNotificationsReadDto,
  UpdateNotificationPreferencesDto,
  ExecuteNotificationActionDto
} from './dto/notification.dto';
// import {
//   SecurityEventFiltersDto,
//   CreateSecurityEventDto,
//   SecurityComplianceReportDto,
//   SuspiciousActivityAnalysisDto,
//   IPBlockingDto
// } from './dto/security-monitoring.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly moderationService: ModerationService,
    private readonly adminEventsService: AdminEventsService,
    private readonly securityAlertService: SecurityAlertService,
    // private readonly securityMonitoringService: SecurityMonitoringService,
    // private readonly auditLogRotationService: AuditLogRotationService, // Temporarily disabled
  ) {}

  // System Settings Endpoints
  @Get('settings')
  @ApiOperation({ summary: 'Get all system settings' })
  @ApiResponse({ status: 200, description: 'System settings retrieved successfully' })
  async getAllSettings() {
    return this.adminService.getAllSettings();
  }

  @Get('settings/:key')
  @ApiOperation({ summary: 'Get a specific system setting' })
  @ApiResponse({ status: 200, description: 'System setting retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Setting not found' })
  async getSetting(@Param('key') key: string) {
    return this.adminService.getSetting(key);
  }

  @Post('settings')
  @ApiOperation({ summary: 'Create a new system setting' })
  @ApiResponse({ status: 201, description: 'System setting created successfully' })
  @ApiResponse({ status: 400, description: 'Setting already exists or invalid data' })
  async createSetting(@Body() createSettingDto: CreateSystemSettingDto) {
    return this.adminService.createSetting(createSettingDto);
  }

  @Put('settings/:key')
  @ApiOperation({ summary: 'Update a system setting' })
  @ApiResponse({ status: 200, description: 'System setting updated successfully' })
  @ApiResponse({ status: 404, description: 'Setting not found' })
  async updateSetting(
    @Param('key') key: string,
    @Body() updateSettingDto: UpdateSystemSettingDto,
  ) {
    return this.adminService.updateSetting(key, updateSettingDto);
  }

  @Delete('settings/:key')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a system setting' })
  @ApiResponse({ status: 204, description: 'System setting deleted successfully' })
  @ApiResponse({ status: 404, description: 'Setting not found' })
  async deleteSetting(@Param('key') key: string) {
    await this.adminService.deleteSetting(key);
  }

  @Post('settings/backup')
  @ApiOperation({ summary: 'Create a backup of current system settings' })
  @ApiResponse({ status: 201, description: 'Settings backup created successfully' })
  async createSettingsBackup(@Body() body: { description: string }) {
    return this.adminService.createSettingsBackup(body.description);
  }

  @Get('settings/backups')
  @ApiOperation({ summary: 'Get list of settings backups' })
  @ApiResponse({ status: 200, description: 'Settings backups retrieved successfully' })
  async getSettingsBackups() {
    return this.adminService.getSettingsBackups();
  }

  @Post('settings/restore/:backupId')
  @ApiOperation({ summary: 'Restore settings from a backup' })
  @ApiResponse({ status: 200, description: 'Settings restored successfully' })
  @ApiResponse({ status: 404, description: 'Backup not found' })
  async restoreSettingsBackup(@Param('backupId') backupId: string) {
    await this.adminService.restoreSettingsBackup(backupId);
    return { message: 'Settings restored successfully' };
  }

  @Post('settings/test')
  @ApiOperation({ summary: 'Test a setting configuration' })
  @ApiResponse({ status: 200, description: 'Setting test completed' })
  async testSetting(@Body() body: { key: string; value: string }) {
    return this.adminService.testSetting(body.key, body.value);
  }

  // Dashboard Metrics Endpoints
  @Get('dashboard-metrics')
  @ApiOperation({ summary: 'Get comprehensive dashboard metrics for real-time monitoring' })
  @ApiResponse({ status: 200, description: 'Dashboard metrics retrieved successfully' })
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    return this.adminService.getDashboardMetrics();
  }

  // System Information Endpoints
  @Get('system-info')
  @ApiOperation({ summary: 'Get system information and statistics' })
  @ApiResponse({ 
    status: 200, 
    description: 'System information retrieved successfully',
    type: SystemInfoDto,
  })
  async getSystemInfo(): Promise<SystemInfoDto> {
    return this.adminService.getSystemInfo();
  }

  // Audit Logs Endpoints
  @Get('audit-logs')
  @ApiOperation({ summary: 'Get audit logs with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Audit logs retrieved successfully' })
  async getAuditLogs(@Query() filters: AuditLogFiltersDto) {
    return this.adminService.getAuditLogs(filters);
  }

  @Post('audit-logs')
  @ApiOperation({ summary: 'Create a new audit log entry' })
  @ApiResponse({ status: 201, description: 'Audit log created successfully' })
  async createAuditLog(@Body() createAuditLogDto: CreateAuditLogDto) {
    return this.adminService.createAuditLog(createAuditLogDto);
  }

  @Delete('audit-logs/cleanup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete old audit logs (default: older than 90 days)' })
  @ApiResponse({ status: 200, description: 'Old audit logs deleted successfully' })
  async cleanupAuditLogs(@Query('days') days?: string) {
    const daysToKeep = days ? parseInt(days, 10) : 90;
    const deletedCount = await this.adminService.deleteOldAuditLogs(daysToKeep);
    return { message: `Deleted ${deletedCount} old audit logs`, deletedCount };
  }

  // Temporarily disabled due to crypto.randomUUID issue
  // @Post('audit-logs/rotate')
  // @ApiOperation({ summary: 'Manually trigger audit log rotation' })
  // @ApiResponse({ status: 200, description: 'Audit log rotation completed successfully' })
  // async rotateAuditLogs(@Query('days') days?: string) {
  //   const retentionDays = days ? parseInt(days, 10) : undefined;
  //   return this.auditLogRotationService.manualRotation(retentionDays);
  // }

  // @Get('audit-logs/stats')
  // @ApiOperation({ summary: 'Get audit log statistics' })
  // @ApiResponse({ status: 200, description: 'Audit log statistics retrieved successfully' })
  // async getAuditLogStats() {
  //   return this.auditLogRotationService.getAuditLogStats();
  // }

  @Get('audit-logs/summary')
  @ApiOperation({ summary: 'Get audit log summary for the specified period' })
  @ApiResponse({ status: 200, description: 'Audit log summary retrieved successfully' })
  async getAuditLogSummary(@Query('days') days?: string) {
    const period = days ? parseInt(days, 10) : 30;
    return this.adminService.getAuditLogSummary(period);
  }

  @Get('audit-logs/user/:userId')
  @ApiOperation({ summary: 'Get audit logs for a specific user' })
  @ApiResponse({ status: 200, description: 'User audit logs retrieved successfully' })
  async getAuditLogsByUser(
    @Param('userId') userId: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.adminService.getAuditLogsByUser(userId, limitNum);
  }

  @Get('audit-logs/resource/:resource')
  @ApiOperation({ summary: 'Get audit logs for a specific resource' })
  @ApiResponse({ status: 200, description: 'Resource audit logs retrieved successfully' })
  async getAuditLogsByResource(
    @Param('resource') resource: string,
    @Query('resourceId') resourceId?: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.adminService.getAuditLogsByResource(resource, resourceId, limitNum);
  }

  @Post('audit-logs/export')
  @ApiOperation({ summary: 'Export audit logs in various formats' })
  @ApiResponse({ status: 200, description: 'Audit logs exported successfully' })
  async exportAuditLogs(@Body() exportDto: AuditLogExportDto, @Res() res: Response) {
    const buffer = await this.adminService.exportAuditLogs(exportDto);
    const filename = `audit-logs-${new Date().toISOString().split('T')[0]}.${exportDto.format}`;
    
    res.set({
      'Content-Type': exportDto.format === 'json' ? 'application/json' : 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    
    res.send(buffer);
  }

  @Get('audit-logs/analytics')
  @ApiOperation({ summary: 'Get audit log analytics and pattern detection' })
  @ApiResponse({ status: 200, description: 'Audit log analytics retrieved successfully' })
  async getAuditLogAnalytics(@Query() analyticsDto: AuditLogAnalyticsDto) {
    return this.adminService.getAuditLogAnalytics(analyticsDto);
  }

  @Get('audit-logs/timeline')
  @ApiOperation({ summary: 'Get audit log timeline with relationship mapping' })
  @ApiResponse({ status: 200, description: 'Audit log timeline retrieved successfully' })
  async getAuditLogTimeline(
    @Query('resourceId') resourceId?: string,
    @Query('userId') userId?: string,
  ) {
    return this.adminService.getAuditLogTimeline(resourceId, userId);
  }

  // Content Moderation Endpoints
  @Get('moderation/queue')
  @ApiOperation({ summary: 'Get moderation queue with filtering and pagination' })
  @ApiResponse({ 
    status: 200, 
    description: 'Moderation queue retrieved successfully',
    type: ModerationQueueResponseDto,
  })
  async getModerationQueue(@Query() filters: ModerationQueueFiltersDto): Promise<ModerationQueueResponseDto> {
    return this.moderationService.getModerationQueue(filters);
  }

  @Get('moderation/stats')
  @ApiOperation({ summary: 'Get moderation statistics and metrics' })
  @ApiResponse({ 
    status: 200, 
    description: 'Moderation statistics retrieved successfully',
    type: ModerationStatsDto,
  })
  async getModerationStats(): Promise<ModerationStatsDto> {
    return this.moderationService.getModerationStats();
  }

  @Get('moderation/comments/:id')
  @ApiOperation({ summary: 'Get detailed information about a specific comment for moderation' })
  @ApiResponse({ status: 200, description: 'Comment details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async getCommentDetails(@Param('id') commentId: string) {
    return this.moderationService.getCommentDetails(commentId);
  }

  @Post('moderation/bulk')
  @ApiOperation({ summary: 'Perform bulk moderation actions on multiple comments' })
  @ApiResponse({ status: 200, description: 'Bulk moderation completed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid moderation data' })
  async bulkModerateComments(
    @Body() bulkModerationDto: BulkModerationDto,
    @Request() req: any,
  ) {
    const moderatorId = req.user.id;
    return this.moderationService.bulkModerateComments(bulkModerationDto, moderatorId);
  }

  @Put('moderation/comments/:id')
  @ApiOperation({ summary: 'Moderate a specific comment' })
  @ApiResponse({ status: 200, description: 'Comment moderated successfully' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async moderateComment(
    @Param('id') commentId: string,
    @Body() body: { action: CommentStatus; moderationNote?: string },
    @Request() req: any,
  ) {
    const moderatorId = req.user.id;
    return this.moderationService.moderateComment(
      commentId,
      body.action,
      body.moderationNote || '',
      moderatorId
    );
  }

  // Sensitive Words Management Endpoints
  @Get('sensitive-words')
  @ApiOperation({ summary: 'Get sensitive words with enhanced filtering and statistics' })
  @ApiResponse({ status: 200, description: 'Sensitive words retrieved successfully' })
  async getSensitiveWords(@Query() filters: any) {
    return this.moderationService.getSensitiveWords(filters);
  }

  @Get('sensitive-words/stats')
  @ApiOperation({ summary: 'Get sensitive words statistics and detection rates' })
  @ApiResponse({ status: 200, description: 'Sensitive words statistics retrieved successfully' })
  async getSensitiveWordsStats() {
    return this.moderationService.getSensitiveWordsStats();
  }

  @Post('sensitive-words/test')
  @ApiOperation({ summary: 'Test content against sensitive word filters' })
  @ApiResponse({ status: 200, description: 'Content tested successfully' })
  async testSensitiveWords(@Body() body: { content: string }) {
    return this.moderationService.testSensitiveWords(body.content);
  }

  // Advanced Bulk Moderation Endpoints
  @Post('moderation/bulk-by-filters')
  @ApiOperation({ summary: 'Perform bulk moderation on comments matching specific filters' })
  @ApiResponse({ status: 200, description: 'Bulk moderation by filters completed successfully' })
  async bulkModerateByFilters(
    @Body() body: { 
      filters: ModerationQueueFiltersDto; 
      action: CommentStatus; 
      moderationNote?: string;
    },
    @Request() req: any,
  ) {
    const moderatorId = req.user.id;
    return this.moderationService.bulkModerateByFilters(
      body.filters,
      body.action,
      body.moderationNote || '',
      moderatorId
    );
  }

  @Get('moderation/automation-rules')
  @ApiOperation({ summary: 'Get available automation rules for content moderation' })
  @ApiResponse({ status: 200, description: 'Automation rules retrieved successfully' })
  async getAutomationRules() {
    return this.moderationService.getAutomationRules();
  }

  @Post('moderation/apply-automation')
  @ApiOperation({ summary: 'Apply automation rules to pending content' })
  @ApiResponse({ status: 200, description: 'Automation rules applied successfully' })
  async applyAutomationRules(@Request() req: any) {
    const moderatorId = req.user.id;
    return this.moderationService.applyAutomationRules(moderatorId);
  }

  @Get('moderation/performance')
  @ApiOperation({ summary: 'Get moderation performance metrics' })
  @ApiResponse({ status: 200, description: 'Performance metrics retrieved successfully' })
  async getModerationPerformance(
    @Query('moderatorId') moderatorId?: string,
    @Query('days') days?: string,
  ) {
    const daysNum = days ? parseInt(days, 10) : 30;
    return this.moderationService.getModerationPerformanceMetrics(moderatorId, daysNum);
  }

  // System Maintenance Endpoints
  @Get('maintenance/cache/stats')
  @ApiOperation({ summary: 'Get cache statistics and performance metrics' })
  @ApiResponse({ status: 200, description: 'Cache statistics retrieved successfully' })
  async getCacheStats() {
    return this.adminService.getCacheStats();
  }

  @Delete('maintenance/cache')
  @ApiOperation({ summary: 'Clear cache with optional pattern matching' })
  @ApiResponse({ status: 200, description: 'Cache cleared successfully' })
  async clearCache(@Query('pattern') pattern?: string) {
    return this.adminService.clearCache(pattern);
  }

  @Get('maintenance/database/stats')
  @ApiOperation({ summary: 'Get database statistics and performance metrics' })
  @ApiResponse({ status: 200, description: 'Database statistics retrieved successfully' })
  async getDatabaseStats() {
    return this.adminService.getDatabaseStats();
  }

  @Post('maintenance/database/optimize')
  @ApiOperation({ summary: 'Optimize database performance with ANALYZE and VACUUM' })
  @ApiResponse({ status: 200, description: 'Database optimization completed successfully' })
  async optimizeDatabase() {
    return this.adminService.optimizeDatabase();
  }

  @Get('maintenance/resources')
  @ApiOperation({ summary: 'Get system resource usage statistics' })
  @ApiResponse({ status: 200, description: 'Resource usage retrieved successfully' })
  async getSystemResourceUsage() {
    return this.adminService.getSystemResourceUsage();
  }

  @Get('maintenance/alerts')
  @ApiOperation({ summary: 'Get configured resource alert thresholds' })
  @ApiResponse({ status: 200, description: 'Resource alerts retrieved successfully' })
  async getResourceAlerts() {
    return this.adminService.getResourceAlerts();
  }

  @Post('maintenance/alerts')
  @ApiOperation({ summary: 'Configure resource alert thresholds' })
  @ApiResponse({ status: 200, description: 'Resource alert configured successfully' })
  async setResourceAlert(
    @Body() body: { type: string; threshold: number; enabled: boolean }
  ) {
    await this.adminService.setResourceAlert(body.type, body.threshold, body.enabled);
    return { message: 'Resource alert configured successfully' };
  }

  @Get('maintenance/logs/retention')
  @ApiOperation({ summary: 'Get log retention policy configuration' })
  @ApiResponse({ status: 200, description: 'Log retention policy retrieved successfully' })
  async getLogRetentionPolicy() {
    return this.adminService.getLogRetentionPolicy();
  }

  @Post('maintenance/logs/retention')
  @ApiOperation({ summary: 'Configure log retention policy' })
  @ApiResponse({ status: 200, description: 'Log retention policy configured successfully' })
  async configureLogRetention(@Body() body: { days: number }) {
    await this.adminService.configureLogRetention(body.days);
    return { message: 'Log retention policy configured successfully' };
  }

  @Get('maintenance/backup/export')
  @ApiOperation({ summary: 'Export full site backup (database + uploads)' })
  @ApiResponse({ status: 200, description: 'Backup archive stream' })
  async exportSiteBackup(
    @Request() req: any,
    @Res() res: Response,
    @Query('includeUploads') includeUploads?: string,
    @Query('includeLogs') includeLogs?: string,
  ) {
    const adminId = req.user?.id;
    return this.adminService.streamSiteBackup(res, {
      includeUploads: includeUploads !== '0',
      includeLogs: includeLogs === '1',
      requestedBy: adminId,
    });
  }

  // System Logs Endpoints
  @Get('system-logs')
  @ApiOperation({ summary: 'Get system logs' })
  @ApiResponse({ status: 200, description: 'System logs retrieved successfully' })
  async getSystemLogs(
    @Query('level') level?: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 100;
    return this.adminService.getSystemLogs(level, limitNum);
  }

  @Delete('system-logs')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Clear system logs' })
  @ApiResponse({ status: 204, description: 'System logs cleared successfully' })
  async clearSystemLogs() {
    await this.adminService.clearSystemLogs();
  }

  // Admin Events Management Endpoints
  @Get('events')
  @ApiOperation({ summary: 'Get all events with admin-level filtering and pagination' })
  @ApiResponse({ 
    status: 200, 
    description: 'Events retrieved successfully',
    type: PaginatedEventsDto,
  })
  async getAllEvents(@Query() filters: AdminEventFiltersDto): Promise<PaginatedEventsDto> {
    return this.adminEventsService.getAllEvents(filters);
  }

  @Post('events')
  @ApiOperation({ summary: 'Create a new event with admin privileges' })
  @ApiResponse({ 
    status: 201, 
    description: 'Event created successfully',
    type: EventResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid event data' })
  async createEvent(
    @Body() createEventDto: AdminCreateEventDto,
    @Request() req: any,
  ): Promise<EventResponseDto> {
    const userId = req.user.id;
    return this.adminEventsService.createEvent(createEventDto, userId);
  }

  @Put('events/:id')
  @ApiOperation({ summary: 'Update an event with admin privileges' })
  @ApiResponse({ 
    status: 200, 
    description: 'Event updated successfully',
    type: EventResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Event not found' })
  @ApiResponse({ status: 400, description: 'Invalid event data' })
  async updateEvent(
    @Param('id') id: string,
    @Body() updateEventDto: AdminUpdateEventDto,
    @Request() req: any,
  ): Promise<EventResponseDto> {
    const userId = req.user.id;
    return this.adminEventsService.updateEvent(id, updateEventDto, userId);
  }

  @Delete('events/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an event with admin privileges' })
  @ApiResponse({ status: 204, description: 'Event deleted successfully' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  @ApiResponse({ status: 400, description: 'Cannot delete event with registrations' })
  async deleteEvent(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<void> {
    const userId = req.user.id;
    return this.adminEventsService.deleteEvent(id, userId);
  }

  @Post('events/:id/duplicate')
  @ApiOperation({ summary: 'Duplicate an existing event' })
  @ApiResponse({ 
    status: 201, 
    description: 'Event duplicated successfully',
    type: EventResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Source event not found' })
  async duplicateEvent(
    @Param('id') sourceEventId: string,
    @Body() duplicateDto: Omit<DuplicateEventDto, 'sourceEventId'>,
    @Request() req: any,
  ): Promise<EventResponseDto> {
    const userId = req.user.id;
    const fullDuplicateDto: DuplicateEventDto = {
      ...duplicateDto,
      sourceEventId,
    };
    return this.adminEventsService.duplicateEvent(fullDuplicateDto, userId);
  }

  @Put('events/:id/workflow')
  @ApiOperation({ summary: 'Update event workflow status' })
  @ApiResponse({ 
    status: 200, 
    description: 'Event workflow updated successfully',
    type: EventResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Event not found' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  async updateEventWorkflow(
    @Param('id') id: string,
    @Body() workflowDto: EventWorkflowDto,
    @Request() req: any,
  ): Promise<EventResponseDto> {
    const userId = req.user.id;
    return this.adminEventsService.updateEventWorkflow(id, workflowDto, userId);
  }

  @Post('events/bulk-action')
  @ApiOperation({ summary: 'Perform bulk actions on multiple events' })
  @ApiResponse({ status: 200, description: 'Bulk action completed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid bulk action data' })
  async bulkEventAction(
    @Body() bulkActionDto: BulkEventActionDto,
    @Request() req: any,
  ) {
    const userId = req.user.id;
    return this.adminEventsService.bulkEventAction(bulkActionDto, userId);
  }

  @Get('events/templates')
  @ApiOperation({ summary: 'Get available event templates' })
  @ApiResponse({ status: 200, description: 'Event templates retrieved successfully' })
  async getEventTemplates() {
    return this.adminEventsService.getEventTemplates();
  }

  @Get('events/:id')
  @ApiOperation({ summary: 'Get a specific event by ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Event retrieved successfully',
    type: EventResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async getEvent(@Param('id') id: string): Promise<EventResponseDto> {
    return this.adminEventsService.getEvent(id);
  }

  @Get('events/:id/analytics')
  @ApiOperation({ summary: 'Get comprehensive analytics for a specific event' })
  @ApiResponse({ status: 200, description: 'Event analytics retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async getEventAnalytics(@Param('id') eventId: string) {
    return this.adminEventsService.getEventAnalytics(eventId);
  }

  @Get('events/:id/registrations')
  @ApiOperation({ summary: 'Get registrations for a specific event with filtering' })
  @ApiResponse({ status: 200, description: 'Event registrations retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async getEventRegistrations(
    @Param('id') eventId: string,
    @Query() filters: any,
  ) {
    return this.adminEventsService.getEventRegistrations(eventId, filters);
  }

  @Get('events/:id/registrations/export')
  @ApiOperation({ summary: 'Export event registrations to CSV or Excel' })
  @ApiResponse({ status: 200, description: 'Event registrations exported successfully' })
  async exportEventRegistrations(
    @Param('id') eventId: string,
    @Query('format') format: 'csv' | 'excel' = 'csv',
  ) {
    const buffer = await this.adminEventsService.exportEventRegistrations(eventId, format);
    
    // Return as base64 for the frontend to handle the download
    return {
      data: buffer.toString('base64'),
      filename: `event-${eventId}-registrations.${format}`,
      contentType: format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  @Post('events/compare')
  @ApiOperation({ summary: 'Compare multiple events performance metrics' })
  @ApiResponse({ status: 200, description: 'Events comparison retrieved successfully' })
  async compareEvents(@Body() body: { eventIds: string[] }) {
    return this.adminEventsService.getEventsComparison(body.eventIds);
  }

  // Security Monitoring Endpoints - Temporarily disabled
  // @Get('security/dashboard')
  // @ApiOperation({ summary: 'Get security dashboard metrics for real-time monitoring' })
  // @ApiResponse({ status: 200, description: 'Security dashboard metrics retrieved successfully' })
  // async getSecurityDashboardMetrics() {
  //   return this.securityMonitoringService.getSecurityDashboardMetrics();
  // }

  // Security Monitoring Endpoints - Temporarily disabled
  // @Get('security/events')
  // @ApiOperation({ summary: 'Get security events with filtering and pagination' })
  // @ApiResponse({ status: 200, description: 'Security events retrieved successfully' })
  // async getSecurityEvents(@Query() filters: SecurityEventFiltersDto) {
  //   return this.securityMonitoringService.getSecurityEvents(filters);
  // }

  // @Post('security/events')
  // @ApiOperation({ summary: 'Create a new security event' })
  // @ApiResponse({ status: 201, description: 'Security event created successfully' })
  // async createSecurityEvent(@Body() createDto: CreateSecurityEventDto) {
  //   return this.securityMonitoringService.createSecurityEvent(createDto);
  // }

  // @Put('security/events/:id/resolve')
  // @ApiOperation({ summary: 'Resolve a security event' })
  // @ApiResponse({ status: 200, description: 'Security event resolved successfully' })
  // async resolveSecurityEvent(
  //   @Param('id') eventId: string,
  //   @Body() body: { resolutionNote?: string }
  // ) {
  //   return this.securityMonitoringService.resolveSecurityEvent(eventId, body.resolutionNote);
  // }

  // @Get('security/failed-logins')
  // @ApiOperation({ summary: 'Get failed login attempts with analysis' })
  // @ApiResponse({ status: 200, description: 'Failed login attempts retrieved successfully' })
  // async getFailedLoginAttempts(@Query() filters: any) {
  //   return this.securityMonitoringService.getFailedLoginAttempts(filters);
  // }

  // @Get('security/failed-logins/analysis')
  // @ApiOperation({ summary: 'Get failed login analysis and patterns' })
  // @ApiResponse({ status: 200, description: 'Failed login analysis retrieved successfully' })
  // async getFailedLoginAnalysis() {
  //   return this.securityMonitoringService.getFailedLoginAnalysis();
  // }

  // @Post('security/suspicious-activity')
  // @ApiOperation({ summary: 'Analyze suspicious activity patterns' })
  // @ApiResponse({ status: 200, description: 'Suspicious activity analysis completed successfully' })
  // async analyzeSuspiciousActivity(@Body() analysisDto: SuspiciousActivityAnalysisDto) {
  //   return this.securityMonitoringService.analyzeSuspiciousActivity(analysisDto);
  // }

  // @Get('security/blocked-ips')
  // @ApiOperation({ summary: 'Get list of blocked IP addresses' })
  // @ApiResponse({ status: 200, description: 'Blocked IPs retrieved successfully' })
  // async getBlockedIPs(
  //   @Query('page') page?: string,
  //   @Query('limit') limit?: string
  // ) {
  //   const pageNum = page ? parseInt(page, 10) : 1;
  //   const limitNum = limit ? parseInt(limit, 10) : 20;
  //   return this.securityMonitoringService.getBlockedIPs(pageNum, limitNum);
  // }

  // @Post('security/blocked-ips')
  // @ApiOperation({ summary: 'Block an IP address' })
  // @ApiResponse({ status: 201, description: 'IP address blocked successfully' })
  // async blockIP(@Body() blockingDto: IPBlockingDto) {
  //   return this.securityMonitoringService.blockIP(blockingDto);
  // }

  // @Post('security/blocked-ips/:ipAddress/unblock')
  // @ApiOperation({ summary: 'Unblock an IP address' })
  // @ApiResponse({ status: 200, description: 'IP address unblocked successfully' })
  // async unblockIP(@Param('ipAddress') ipAddress: string) {
  //   return this.securityMonitoringService.unblockIP(ipAddress);
  // }

  // @Post('security/events/:id/resolve')
  // @ApiOperation({ summary: 'Resolve a security event' })
  // @ApiResponse({ status: 200, description: 'Security event resolved successfully' })
  // async resolveSecurityEventPost(
  //   @Param('id') eventId: string,
  //   @Body() body: { resolutionNote?: string }
  // ) {
  //   return this.securityMonitoringService.resolveSecurityEvent(eventId, body.resolutionNote);
  // }

  // @Post('security/compliance')
  // @ApiOperation({ summary: 'Generate security compliance report' })
  // @ApiResponse({ status: 200, description: 'Compliance report generated successfully' })
  // async generateComplianceReport(@Body() reportDto: SecurityComplianceReportDto) {
  //   return this.securityMonitoringService.generateComplianceReport(reportDto);
  // }

  // Security Alert System Endpoints
  @Get('security/alerts')
  @ApiOperation({ summary: 'Get security alerts with filtering and pagination' })
  @ApiResponse({ 
    status: 200, 
    description: 'Security alerts retrieved successfully',
    type: PaginatedSecurityAlertsDto,
  })
  async getSecurityAlerts(@Query() filters: SecurityAlertFiltersDto): Promise<PaginatedSecurityAlertsDto> {
    const alertFilters = {
      severity: filters.severity,
      acknowledged: filters.acknowledged,
      resolved: filters.resolved,
      startDate: filters.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters.endDate ? new Date(filters.endDate) : undefined,
      page: filters.page,
      limit: filters.limit,
    };
    
    const result = await this.securityAlertService.getAlerts(alertFilters);
    return {
      ...result,
      limit: filters.limit || 20,
    };
  }

  @Post('security/alerts')
  @ApiOperation({ summary: 'Create a new security alert' })
  @ApiResponse({ 
    status: 201, 
    description: 'Security alert created successfully',
    type: SecurityAlertResponseDto,
  })
  async createSecurityAlert(
    @Body() createAlertDto: CreateSecurityAlertDto,
    @Request() req: any,
  ): Promise<SecurityAlertResponseDto> {
    return this.securityAlertService.createAlert(createAlertDto);
  }

  @Get('security/alerts/:id')
  @ApiOperation({ summary: 'Get a specific security alert by ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Security alert retrieved successfully',
    type: SecurityAlertResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Alert not found' })
  async getSecurityAlert(@Param('id') alertId: string): Promise<SecurityAlertResponseDto> {
    const alert = await this.securityAlertService.getAlert(alertId);
    if (!alert) {
      throw new Error('Alert not found');
    }
    return alert as SecurityAlertResponseDto;
  }

  @Post('security/alerts/:id/acknowledge')
  @ApiOperation({ summary: 'Acknowledge a security alert' })
  @ApiResponse({ 
    status: 200, 
    description: 'Security alert acknowledged successfully',
    type: SecurityAlertResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Alert not found' })
  @ApiResponse({ status: 400, description: 'Alert already acknowledged' })
  async acknowledgeSecurityAlert(
    @Param('id') alertId: string,
    @Body() acknowledgeDto: AcknowledgeAlertDto,
    @Request() req: any,
  ): Promise<SecurityAlertResponseDto> {
    const userId = req.user.id;
    return this.securityAlertService.acknowledgeAlert(alertId, userId);
  }

  @Post('security/alerts/:id/resolve')
  @ApiOperation({ summary: 'Resolve a security alert' })
  @ApiResponse({ 
    status: 200, 
    description: 'Security alert resolved successfully',
    type: SecurityAlertResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Alert not found' })
  @ApiResponse({ status: 400, description: 'Alert already resolved' })
  async resolveSecurityAlert(
    @Param('id') alertId: string,
    @Body() resolveDto: ResolveAlertDto,
    @Request() req: any,
  ): Promise<SecurityAlertResponseDto> {
    const userId = req.user.id;
    return this.securityAlertService.resolveAlert(alertId, userId, resolveDto.resolutionNote);
  }

  @Get('security/alerts/metrics')
  @ApiOperation({ summary: 'Get security alert metrics and statistics' })
  @ApiResponse({ status: 200, description: 'Security alert metrics retrieved successfully' })
  async getSecurityAlertMetrics(@Query() metricsDto: SecurityAlertMetricsDto) {
    return this.securityAlertService.getAlertMetrics(metricsDto.days);
  }

  // Alert Rules Management
  @Get('security/alert-rules')
  @ApiOperation({ summary: 'Get all alert rules' })
  @ApiResponse({ status: 200, description: 'Alert rules retrieved successfully' })
  async getAlertRules() {
    return this.securityAlertService.getAlertRules();
  }

  @Post('security/alert-rules')
  @ApiOperation({ summary: 'Create a new alert rule' })
  @ApiResponse({ status: 201, description: 'Alert rule created successfully' })
  async createAlertRule(@Body() createRuleDto: CreateAlertRuleDto) {
    const ruleData = {
      ...createRuleDto,
      enabled: createRuleDto.enabled ?? true,
      conditions: createRuleDto.conditions || {},
    };
    return this.securityAlertService.addAlertRule(ruleData);
  }

  @Put('security/alert-rules/:id')
  @ApiOperation({ summary: 'Update an alert rule' })
  @ApiResponse({ status: 200, description: 'Alert rule updated successfully' })
  @ApiResponse({ status: 404, description: 'Alert rule not found' })
  async updateAlertRule(
    @Param('id') ruleId: string,
    @Body() updateRuleDto: UpdateAlertRuleDto,
  ) {
    return this.securityAlertService.updateAlertRule(ruleId, updateRuleDto);
  }

  @Delete('security/alert-rules/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an alert rule' })
  @ApiResponse({ status: 204, description: 'Alert rule deleted successfully' })
  @ApiResponse({ status: 404, description: 'Alert rule not found' })
  async deleteAlertRule(@Param('id') ruleId: string) {
    // Implementation would delete the rule
    // For now, just return success
  }

  // Notification Channels Management
  @Get('security/notification-channels')
  @ApiOperation({ summary: 'Get all notification channels' })
  @ApiResponse({ status: 200, description: 'Notification channels retrieved successfully' })
  async getNotificationChannels() {
    return this.securityAlertService.getNotificationChannels();
  }

  @Post('security/notification-channels')
  @ApiOperation({ summary: 'Create a new notification channel' })
  @ApiResponse({ status: 201, description: 'Notification channel created successfully' })
  async createNotificationChannel(@Body() createChannelDto: CreateNotificationChannelDto) {
    const channelData = {
      ...createChannelDto,
      config: createChannelDto.config || {},
      enabled: createChannelDto.enabled ?? true,
    };
    return this.securityAlertService.addNotificationChannel(channelData);
  }

  @Put('security/notification-channels/:id')
  @ApiOperation({ summary: 'Update a notification channel' })
  @ApiResponse({ status: 200, description: 'Notification channel updated successfully' })
  @ApiResponse({ status: 404, description: 'Notification channel not found' })
  async updateNotificationChannel(
    @Param('id') channelId: string,
    @Body() updateChannelDto: UpdateNotificationChannelDto,
  ) {
    return this.securityAlertService.updateNotificationChannel(channelId, updateChannelDto);
  }

  @Delete('security/notification-channels/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a notification channel' })
  @ApiResponse({ status: 204, description: 'Notification channel deleted successfully' })
  @ApiResponse({ status: 404, description: 'Notification channel not found' })
  async deleteNotificationChannel(@Param('id') channelId: string) {
    // Implementation would delete the channel
    // For now, just return success
  }

  @Post('security/notification-channels/:id/test')
  @ApiOperation({ summary: 'Test a notification channel' })
  @ApiResponse({ status: 200, description: 'Test notification sent successfully' })
  @ApiResponse({ status: 404, description: 'Notification channel not found' })
  async testNotificationChannel(
    @Param('id') channelId: string,
    @Body() testDto: TestNotificationChannelDto,
  ) {
    // Implementation would test the notification channel
    return { message: 'Test notification sent successfully' };
  }

  // Notification Management Endpoints
  @Post('notifications')
  @ApiOperation({ summary: 'Create a new notification' })
  @ApiResponse({ status: 201, description: 'Notification created successfully' })
  async createNotification(@Body() createNotificationDto: CreateNotificationDto) {
    return this.adminService.createNotification(createNotificationDto);
  }

  @Get('notifications')
  @ApiOperation({ summary: 'Get notifications with filtering' })
  @ApiResponse({ status: 200, description: 'Notifications retrieved successfully' })
  async getNotifications(@Query() filters: GetNotificationsDto, @Request() req: any) {
    return this.adminService.getNotifications(filters, req.user.id);
  }

  @Put('notifications/:id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  async markNotificationAsRead(@Param('id') id: string, @Request() req: any) {
    return this.adminService.markNotificationAsRead(id, req.user.id);
  }

  @Put('notifications/read')
  @ApiOperation({ summary: 'Mark multiple notifications as read' })
  @ApiResponse({ status: 200, description: 'Notifications marked as read' })
  async markNotificationsAsRead(@Body() dto: MarkNotificationsReadDto, @Request() req: any) {
    return this.adminService.markNotificationsAsRead(dto.notificationIds, req.user.id);
  }

  @Delete('notifications/:id')
  @ApiOperation({ summary: 'Delete notification' })
  @ApiResponse({ status: 200, description: 'Notification deleted successfully' })
  async deleteNotification(@Param('id') id: string, @Request() req: any) {
    return this.adminService.deleteNotification(id, req.user.id);
  }

  @Get('notifications/preferences')
  @ApiOperation({ summary: 'Get user notification preferences' })
  @ApiResponse({ status: 200, description: 'Notification preferences retrieved successfully' })
  async getNotificationPreferences(@Request() req: any) {
    return this.adminService.getNotificationPreferences(req.user.id);
  }

  @Put('notifications/preferences')
  @ApiOperation({ summary: 'Update user notification preferences' })
  @ApiResponse({ status: 200, description: 'Notification preferences updated successfully' })
  async updateNotificationPreferences(
    @Body() dto: UpdateNotificationPreferencesDto,
    @Request() req: any
  ) {
    return this.adminService.updateNotificationPreferences(req.user.id, dto);
  }

  @Post('notifications/:id/actions/:actionId')
  @ApiOperation({ summary: 'Execute notification action' })
  @ApiResponse({ status: 200, description: 'Notification action executed successfully' })
  async executeNotificationAction(
    @Param('id') notificationId: string,
    @Param('actionId') actionId: string,
    @Request() req: any
  ) {
    return this.adminService.executeNotificationAction(notificationId, actionId, req.user.id);
  }

  @Get('notifications/stats')
  @ApiOperation({ summary: 'Get notification statistics' })
  @ApiResponse({ status: 200, description: 'Notification statistics retrieved successfully' })
  async getNotificationStats(@Request() req: any) {
    return this.adminService.getNotificationStats(req.user.id);
  }

  // Cache Management Endpoints
  @Get('cache/performance')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get cache performance report' })
  @ApiResponse({ status: 200, description: 'Cache performance report retrieved successfully' })
  async getCachePerformanceReport() {
    return this.adminService.getCachePerformanceReport();
  }

  @Get('cache/health')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get cache health status' })
  @ApiResponse({ status: 200, description: 'Cache health status retrieved successfully' })
  async getCacheHealthStatus() {
    return this.adminService.getCacheHealthStatus();
  }

  @Get('cache/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get detailed cache statistics' })
  @ApiResponse({ status: 200, description: 'Cache statistics retrieved successfully' })
  async getCacheDetailedStats() {
    return this.adminService.getCacheDetailedStats();
  }

  @Get('cache/trends')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get cache performance trends' })
  @ApiResponse({ status: 200, description: 'Cache performance trends retrieved successfully' })
  async getCachePerformanceTrends(@Query('hours') hours?: number) {
    return this.adminService.getCachePerformanceTrends(hours);
  }

  @Post('cache/warmup')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Warm up cache' })
  @ApiResponse({ status: 200, description: 'Cache warmup initiated successfully' })
  async warmupCache() {
    return this.adminService.warmupCache();
  }

  @Delete('cache/admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Invalidate admin caches' })
  @ApiResponse({ status: 200, description: 'Admin caches invalidated successfully' })
  async invalidateAdminCaches() {
    return this.adminService.invalidateAdminCaches();
  }

  @Delete('cache/users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Invalidate user caches' })
  @ApiResponse({ status: 200, description: 'User caches invalidated successfully' })
  async invalidateUserCaches() {
    return this.adminService.invalidateUserCaches();
  }

  @Delete('cache/events')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Invalidate event caches' })
  @ApiResponse({ status: 200, description: 'Event caches invalidated successfully' })
  async invalidateEventCaches() {
    return this.adminService.invalidateEventCaches();
  }

  @Get('cache/metrics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get cache metrics' })
  @ApiResponse({ status: 200, description: 'Cache metrics retrieved successfully' })
  async getCacheMetrics() {
    return this.adminService.getCacheMetrics();
  }

  @Delete('cache/metrics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset cache metrics' })
  @ApiResponse({ status: 200, description: 'Cache metrics reset successfully' })
  async resetCacheMetrics() {
    return this.adminService.resetCacheMetrics();
  }

  // ========== Payment Order Ledger ==========

  @Get('orders')
  @ApiOperation({ summary: 'Get payment orders with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
  async getOrders(
    @Query('eventId') eventId?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getOrders({
      eventId,
      status,
      startDate,
      endDate,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('orders/stats')
  @ApiOperation({ summary: 'Get payment order statistics' })
  @ApiResponse({ status: 200, description: 'Order statistics retrieved successfully' })
  async getOrderStats(
    @Query('eventId') eventId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminService.getOrderStats({ eventId, startDate, endDate });
  }

  @Get('orders/export')
  @ApiOperation({ summary: 'Export payment orders as Excel file' })
  @ApiResponse({ status: 200, description: 'Orders exported successfully' })
  async exportOrders(
    @Query('eventId') eventId?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Res() res?: Response,
  ) {
    const buffer = await this.adminService.exportOrdersExcel({ eventId, status, startDate, endDate });
    const filename = `payment-ledger-${new Date().toISOString().split('T')[0]}.xlsx`;

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(buffer);
  }
}