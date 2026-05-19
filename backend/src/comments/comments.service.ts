import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SensitiveWordsService } from '../sensitive-words/sensitive-words.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CommentFiltersDto } from './dto/comment-filters.dto';
import { CommentResponseDto } from './dto/comment-response.dto';
import { ModerateCommentDto } from './dto/moderate-comment.dto';
import { ReportCommentDto } from './dto/report-comment.dto';
import { ModerationQueueFiltersDto, ModerationQueueResponseDto } from './dto/moderation-queue.dto';
import { CommentStatus, CommentTargetType, UserRole } from '@prisma/client';
import { NotificationEventsService } from '../notifications/notification-events.service';

@Injectable()
export class CommentsService {
  constructor(
    private prisma: PrismaService,
    private sensitiveWordsService: SensitiveWordsService,
    private notificationEvents: NotificationEventsService,
  ) {}

  async create(createCommentDto: CreateCommentDto, userId: string): Promise<CommentResponseDto> {
    const { content, targetType, targetId, parentId } = createCommentDto;

    // Validate target exists
    await this.validateTarget(targetType, targetId);

    // If parentId is provided, validate parent comment exists and belongs to same target
    if (parentId) {
      const parentComment = await this.prisma.comment.findUnique({
        where: { id: parentId },
      });

      if (!parentComment) {
        throw new NotFoundException('Parent comment not found');
      }

      if (parentComment.targetType !== targetType || parentComment.targetId !== targetId) {
        throw new BadRequestException('Parent comment must belong to the same target');
      }
    }

    // Check content for sensitive words
    const sensitiveCheck = await this.sensitiveWordsService.checkContent(content);
    
    // Determine initial status based on sensitive word check
    let initialStatus: CommentStatus = CommentStatus.APPROVED;
    const sensitiveFlags: string[] = [];

    if (!sensitiveCheck.isClean) {
      // Flag comment based on severity level
      if (sensitiveCheck.maxLevel >= 4) {
        initialStatus = CommentStatus.REJECTED; // Auto-reject high severity
      } else if (sensitiveCheck.maxLevel >= 2) {
        initialStatus = CommentStatus.FLAGGED; // Flag for review
      } else {
        initialStatus = CommentStatus.PENDING; // Low severity, pending review
      }

      // Store detected sensitive word categories
      sensitiveFlags.push(...sensitiveCheck.detectedWords.map(w => w.category));
    }

    const comment = await this.prisma.comment.create({
      data: {
        content,
        targetType,
        targetId,
        parentId,
        userId,
        status: initialStatus,
        sensitiveFlags,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    // Send notification if comment was flagged
    if (initialStatus === CommentStatus.FLAGGED && sensitiveFlags.length > 0) {
      // Get admin/moderator emails
      const moderators = await this.prisma.user.findMany({
        where: {
          role: { in: ['ADMIN', 'EDITOR'] },
          isActive: true,
        },
        select: { email: true },
      });

      const moderatorEmails = moderators.map(m => m.email);
      
      if (moderatorEmails.length > 0) {
        // Get target title for context
        let targetTitle = 'Unknown';
        try {
          if (targetType === CommentTargetType.EVENT) {
            const event = await this.prisma.event.findUnique({
              where: { id: targetId },
              select: { title: true },
            });
            targetTitle = event?.title || 'Unknown Event';
          } else if (targetType === CommentTargetType.NEWS) {
            const news = await this.prisma.news.findUnique({
              where: { id: targetId },
              select: { title: true },
            });
            targetTitle = news?.title || 'Unknown News';
          }
        } catch (error) {
          // Ignore errors in fetching target title
        }

        await this.notificationEvents.onCommentFlagged(
          moderatorEmails,
          comment.user.username,
          content,
          sensitiveFlags,
          targetType,
          targetTitle,
        );
      }
    }

    return this.mapToResponseDto(comment);
  }

  async findAll(filters: CommentFiltersDto): Promise<{ comments: CommentResponseDto[]; total: number }> {
    const { status, targetType, targetId, userId, search, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status) where.status = status;
    if (targetType) where.targetType = targetType;
    if (targetId) where.targetId = targetId;
    if (userId) where.userId = userId;
    if (search) {
      where.content = {
        contains: search,
        mode: 'insensitive',
      };
    }

    const [comments, total] = await Promise.all([
      this.prisma.comment.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
          replies: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  firstName: true,
                  lastName: true,
                  avatar: true,
                },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.comment.count({ where }),
    ]);

    return {
      comments: comments.map(comment => this.mapToResponseDto(comment)),
      total,
    };
  }

  async findOne(id: string): Promise<CommentResponseDto> {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    return this.mapToResponseDto(comment);
  }

  async findByTarget(targetType: CommentTargetType, targetId: string, includeReplies = true): Promise<CommentResponseDto[]> {
    // Validate target exists
    await this.validateTarget(targetType, targetId);

    const comments = await this.prisma.comment.findMany({
      where: {
        targetType,
        targetId,
        parentId: null, // Only get top-level comments
        status: CommentStatus.APPROVED, // Only show approved comments to public
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        ...(includeReplies && {
          replies: {
            where: { status: CommentStatus.APPROVED },
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  firstName: true,
                  lastName: true,
                  avatar: true,
                },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        }),
      },
      orderBy: { createdAt: 'desc' },
    });

    return comments.map(comment => this.mapToResponseDto(comment));
  }

  async update(id: string, updateCommentDto: UpdateCommentDto, userId: string, userRole: UserRole): Promise<CommentResponseDto> {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Only comment owner can edit content, admins can change status
    if (updateCommentDto.content && comment.userId !== userId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    if (updateCommentDto.status && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can change comment status');
    }

    const updatedComment = await this.prisma.comment.update({
      where: { id },
      data: updateCommentDto,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    return this.mapToResponseDto(updatedComment);
  }

  async remove(id: string, userId: string, userRole: UserRole): Promise<void> {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Only comment owner or admin can delete
    if (comment.userId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only delete your own comments or be an admin');
    }

    // Delete all replies first (cascade delete)
    await this.prisma.comment.deleteMany({
      where: { parentId: id },
    });

    await this.prisma.comment.delete({
      where: { id },
    });
  }

  async moderateComment(id: string, moderateDto: ModerateCommentDto, moderatorId: string): Promise<CommentResponseDto> {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    const updatedComment = await this.prisma.comment.update({
      where: { id },
      data: { 
        status: moderateDto.status,
        moderationNote: moderateDto.moderationNote,
        moderatedBy: moderatorId,
        moderatedAt: new Date(),
      } as any,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        reports: {
          include: {
            reporter: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
      } as any,
    });

    // Get moderator information separately
    const moderator = await this.prisma.user.findUnique({
      where: { id: moderatorId },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
      },
    });

    // TODO: Send notification to comment author about moderation decision
    // This will be implemented when notification system is ready

    return this.mapToModerationResponseDto({
      ...updatedComment,
      moderator,
    });
  }

  /* BROKEN DUPLICATE SECTION - COMMENTED OUT
  // Removed duplicate methods - using the ones below
    const skip = (page - 1) * limit;

    const where: any = {};

    // Only show comments that need moderation or are flagged
    if (status) {
      where.status = status;
    } else {
      where.status = {
        in: [CommentStatus.PENDING, CommentStatus.FLAGGED],
      };
    }

    if (targetType) where.targetType = targetType;
    if (targetId) where.targetId = targetId;
    if (search) {
      where.content = {
        contains: search,
        mode: 'insensitive',
      };
    }

    const orderBy: any = {};
    if (sortBy === 'reportCount') {
      // For report count sorting, we'll need to use raw query or handle it differently
      orderBy.createdAt = sortOrder;
    } else {
      orderBy[sortBy] = sortOrder;
    }

    const [comments, total] = await Promise.all([
      this.prisma.comment.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
          reports: {
            include: {
              reporter: {
                select: {
                  id: true,
                  username: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
        } as any,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.comment.count({ where }),
    ]);

    // Get moderator information for comments that have been moderated
    const commentsWithModerators = await Promise.all(
      comments.map(async (comment: any) => {
        if (comment.moderatedBy) {
          const moderator = await this.prisma.user.findUnique({
            where: { id: comment.moderatedBy },
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          });
          return { ...comment, moderator };
        }
        return comment;
      })
    );

    return {
      comments: commentsWithModerators.map(comment => this.mapToModerationResponseDto(comment)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  } */

  // Duplicate method removed - using implementation below
  async getCommentReports(commentId: string): Promise<any[]> {
    const reports = await (this.prisma as any).commentReport.findMany({
      where: { commentId },
      include: {
        reporter: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reports;
  }

  private async validateTarget(targetType: CommentTargetType, targetId: string): Promise<void> {
    let exists = false;

    switch (targetType) {
      case CommentTargetType.EVENT:
        exists = !!(await this.prisma.event.findUnique({ where: { id: targetId } }));
        break;
      case CommentTargetType.NEWS:
        exists = !!(await this.prisma.news.findUnique({ where: { id: targetId } }));
        break;
      case CommentTargetType.SUBMISSION:
        exists = !!(await this.prisma.submission.findUnique({ where: { id: targetId } }));
        break;
    }

    if (!exists) {
      throw new NotFoundException(`${targetType.toLowerCase()} not found`);
    }
  }

  private mapToResponseDto(comment: any): CommentResponseDto {
    return {
      id: comment.id,
      content: comment.content,
      status: comment.status,
      targetType: comment.targetType,
      targetId: comment.targetId,
      sensitiveFlags: comment.sensitiveFlags,
      parentId: comment.parentId,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      userId: comment.userId,
      user: comment.user,
      replies: comment.replies?.map((reply: any) => this.mapToResponseDto(reply)),
      replyCount: comment.replies?.length || 0,
    };
  }

  private mapToModerationResponseDto(comment: any): CommentResponseDto & {
    moderationNote?: string;
    moderatedBy?: string;
    moderatedAt?: Date;
    moderator?: any;
    reports?: any[];
    reportCount?: number;
  } {
    return {
      id: comment.id,
      content: comment.content,
      status: comment.status,
      targetType: comment.targetType,
      targetId: comment.targetId,
      sensitiveFlags: comment.sensitiveFlags,
      parentId: comment.parentId,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      userId: comment.userId,
      user: comment.user,
      replies: comment.replies?.map((reply: any) => this.mapToResponseDto(reply)),
      replyCount: comment.replies?.length || 0,
      moderationNote: comment.moderationNote,
      moderatedBy: comment.moderatedBy,
      moderatedAt: comment.moderatedAt,
      moderator: comment.moderator,
      reports: comment.reports,
      reportCount: comment._count?.reports || 0,
    };
  }

  // Moderation methods

  async getModerationQueue(filters: ModerationQueueFiltersDto): Promise<{ comments: ModerationQueueResponseDto[]; total: number }> {
    const { status, targetType, category, search, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Only show comments that need moderation
    if (status) {
      where.status = status;
    } else {
      where.status = {
        in: [CommentStatus.PENDING, CommentStatus.FLAGGED],
      };
    }

    if (targetType) where.targetType = targetType;
    if (category) {
      where.sensitiveFlags = {
        has: category,
      };
    }
    if (search) {
      where.content = {
        contains: search,
        mode: 'insensitive',
      };
    }

    const [comments, total] = await Promise.all([
      this.prisma.comment.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          reports: {
            include: {
              reporter: {
                select: {
                  id: true,
                  username: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: [
          { status: 'asc' }, // Flagged first
          { createdAt: 'asc' }, // Oldest first
        ],
        skip,
        take: limit,
      }),
      this.prisma.comment.count({ where }),
    ]);

    // Fetch target information for each comment
    const enrichedComments = await Promise.all(
      comments.map(async (comment) => {
        let target = null;
        
        try {
          switch (comment.targetType) {
            case CommentTargetType.EVENT:
              target = await this.prisma.event.findUnique({
                where: { id: comment.targetId },
                select: { id: true, title: true },
              });
              break;
            case CommentTargetType.NEWS:
              target = await this.prisma.news.findUnique({
                where: { id: comment.targetId },
                select: { id: true, title: true },
              });
              break;
            case CommentTargetType.SUBMISSION:
              target = await this.prisma.submission.findUnique({
                where: { id: comment.targetId },
                select: { id: true, title: true },
              });
              break;
          }
        } catch (error) {
          // Target might have been deleted, continue without target info
        }

        return {
          id: comment.id,
          content: comment.content,
          status: comment.status,
          targetType: comment.targetType,
          targetId: comment.targetId,
          sensitiveFlags: comment.sensitiveFlags,
          createdAt: comment.createdAt,
          updatedAt: comment.updatedAt,
          user: comment.user,
          target,
          reports: comment.reports.map(report => ({
            id: report.id,
            reason: report.reason,
            description: report.description || '',
            reportedAt: report.createdAt,
            reportedBy: report.reporter,
          })),
          reportCount: comment.reports.length,
        };
      })
    );

    return {
      comments: enrichedComments,
      total,
    };
  }

  async reportComment(commentId: string, reportDto: ReportCommentDto, reporterId: string): Promise<void> {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Check if user already reported this comment
    const existingReport = await this.prisma.commentReport.findUnique({
      where: {
        commentId_reportedBy: {
          commentId,
          reportedBy: reporterId,
        },
      },
    });

    if (existingReport) {
      throw new BadRequestException('You have already reported this comment');
    }

    // Create the report
    await this.prisma.commentReport.create({
      data: {
        commentId,
        reportedBy: reporterId,
        reason: reportDto.reason,
        description: reportDto.description,
      },
    });

    // If this is the first report, flag the comment for review
    const reportCount = await this.prisma.commentReport.count({
      where: { commentId },
    });

    if (reportCount === 1 && comment.status === CommentStatus.APPROVED) {
      await this.prisma.comment.update({
        where: { id: commentId },
        data: { status: CommentStatus.FLAGGED },
      });
    }
  }

  async moderateCommentAdvanced(
    id: string, 
    moderateDto: ModerateCommentDto, 
    moderatorId: string
  ): Promise<CommentResponseDto> {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    const updatedComment = await this.prisma.comment.update({
      where: { id },
      data: { 
        status: moderateDto.status,
        // Store moderation info in a separate table if needed
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    // TODO: Send notification to comment author about moderation decision
    // TODO: Log moderation action in audit log

    return this.mapToResponseDto(updatedComment);
  }

  /* DUPLICATE METHOD - COMMENTED OUT
  async getCommentReports(commentId: string): Promise<any[]> {
    const reports = await this.prisma.commentReport.findMany({
      where: { commentId },
      include: {
        reporter: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reports.map(report => ({
      id: report.id,
      reason: report.reason,
      description: report.description,
      reportedAt: report.createdAt,
      reportedBy: report.reporter,
    }));
  } */

  async getModerationStats(): Promise<{
    pending: number;
    flagged: number;
    approved: number;
    rejected: number;
    totalReports: number;
  }> {
    const [pending, flagged, approved, rejected, totalReports] = await Promise.all([
      this.prisma.comment.count({ where: { status: CommentStatus.PENDING } }),
      this.prisma.comment.count({ where: { status: CommentStatus.FLAGGED } }),
      this.prisma.comment.count({ where: { status: CommentStatus.APPROVED } }),
      this.prisma.comment.count({ where: { status: CommentStatus.REJECTED } }),
      this.prisma.commentReport.count(),
    ]);

    return {
      pending,
      flagged,
      approved,
      rejected,
      totalReports,
    };
  }}
