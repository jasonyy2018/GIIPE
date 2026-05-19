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
} from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CommentFiltersDto } from './dto/comment-filters.dto';
import { ModerateCommentDto } from './dto/moderate-comment.dto';
import { ReportCommentDto } from './dto/report-comment.dto';
import { ModerationQueueFiltersDto } from './dto/moderation-queue.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole, CommentTargetType } from '@prisma/client';

@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createCommentDto: CreateCommentDto, @CurrentUser() user: any) {
    return this.commentsService.create(createCommentDto, user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  findAll(@Query() filters: CommentFiltersDto) {
    return this.commentsService.findAll(filters);
  }

  @Get('by-target/:targetType/:targetId')
  @Public()
  findByTarget(
    @Param('targetType') targetType: CommentTargetType,
    @Param('targetId') targetId: string,
    @Query('includeReplies') includeReplies?: string,
  ) {
    const includeRepliesFlag = includeReplies !== 'false';
    return this.commentsService.findByTarget(targetType, targetId, includeRepliesFlag);
  }

  @Get(':id')
  @Public()
  findOne(@Param('id') id: string) {
    return this.commentsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @Body() updateCommentDto: UpdateCommentDto,
    @CurrentUser() user: any,
  ) {
    return this.commentsService.update(id, updateCommentDto, user.id, user.role);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.commentsService.remove(id, user.id, user.role);
  }

  @Patch(':id/moderate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  moderate(
    @Param('id') id: string,
    @Body() moderateDto: ModerateCommentDto,
    @CurrentUser() user: any,
  ) {
    return this.commentsService.moderateComment(id, moderateDto, user.id);
  }

  @Post(':id/report')
  @UseGuards(JwtAuthGuard)
  reportComment(
    @Param('id') id: string,
    @Body() reportDto: ReportCommentDto,
    @CurrentUser() user: any,
  ) {
    return this.commentsService.reportComment(id, reportDto, user.id);
  }

  @Get('moderation/queue')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  getModerationQueue(@Query() filters: ModerationQueueFiltersDto) {
    return this.commentsService.getModerationQueue(filters);
  }

  @Get('moderation/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  getModerationStats() {
    return this.commentsService.getModerationStats();
  }

  @Get(':id/reports')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  getCommentReports(@Param('id') id: string) {
    return this.commentsService.getCommentReports(id);
  }

  @Patch(':id/moderate-advanced')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  moderateAdvanced(
    @Param('id') id: string,
    @Body() moderateDto: ModerateCommentDto,
    @CurrentUser() user: any,
  ) {
    return this.commentsService.moderateCommentAdvanced(id, moderateDto, user.id);
  }
}