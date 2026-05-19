import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SensitiveWordsService } from '../../sensitive-words/sensitive-words.service';
import { CommentStatus, CommentTargetType } from '@prisma/client';
import { 
  ModerationQueueFiltersDto, 
  BulkModerationDto, 
  ModerationQueueResponseDto,
  ModerationStatsDto 
} from '../dto/moderation-queue.dto';

@Injectable()
export class ModerationService {
  constructor(
    private prisma: PrismaService,
    private sensitiveWordsService: SensitiveWordsService
  ) {}

  async getModerationQueue(filters: ModerationQueueFiltersDto): Promise<ModerationQueueResponseDto> {
    const { 
      status, 
      targetType, 
      category, 
      search, 
      page = 1, 
      limit = 20, 
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = filters;
    
    const skip = (page - 1) * limit;
    const where: any = {};

    // Only show comments that need moderation by default
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

    // Build order by clause
    const orderBy: any = {};
    if (sortBy === 'reportCount') {
      // For report count sorting, we'll handle it after fetching
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
        orderBy,
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

    // Sort by report count if requested
    if (sortBy === 'reportCount') {
      enrichedComments.sort((a, b) => {
        const comparison = b.reportCount - a.reportCount;
        return sortOrder === 'desc' ? comparison : -comparison;
      });
    }

    return {
      comments: enrichedComments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async bulkModerateComments(
    bulkModerationDto: BulkModerationDto,
    moderatorId: string
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const { commentIds, action, moderationNote } = bulkModerationDto;
    
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const commentId of commentIds) {
      try {
        const comment = await this.prisma.comment.findUnique({
          where: { id: commentId },
        });

        if (!comment) {
          errors.push(`Comment ${commentId} not found`);
          failed++;
          continue;
        }

        await this.prisma.comment.update({
          where: { id: commentId },
          data: {
            status: action,
            moderationNote,
            moderatedBy: moderatorId,
            moderatedAt: new Date(),
          },
        });

        // Create audit log entry
        await this.prisma.auditLog.create({
          data: {
            userId: moderatorId,
            action: 'MODERATE_COMMENT',
            resource: 'comment',
            resourceId: commentId,
            details: {
              previousStatus: comment.status,
              newStatus: action,
              moderationNote,
            },
          },
        });

        success++;
      } catch (error) {
        errors.push(`Failed to moderate comment ${commentId}: ${error.message}`);
        failed++;
      }
    }

    return { success, failed, errors };
  }

  async getModerationStats(): Promise<ModerationStatsDto> {
    const [
      pending,
      flagged,
      approved,
      rejected,
      totalReports,
      recentModerations
    ] = await Promise.all([
      this.prisma.comment.count({ where: { status: CommentStatus.PENDING } }),
      this.prisma.comment.count({ where: { status: CommentStatus.FLAGGED } }),
      this.prisma.comment.count({ where: { status: CommentStatus.APPROVED } }),
      this.prisma.comment.count({ where: { status: CommentStatus.REJECTED } }),
      this.prisma.commentReport.count(),
      this.prisma.comment.findMany({
        where: {
          moderatedAt: { not: null },
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
        },
        select: {
          createdAt: true,
          moderatedAt: true,
        },
      }),
    ]);

    // Calculate average response time
    let avgResponseTime = 0;
    if (recentModerations.length > 0) {
      const totalResponseTime = recentModerations.reduce((sum, comment) => {
        if (comment.moderatedAt) {
          return sum + (comment.moderatedAt.getTime() - comment.createdAt.getTime());
        }
        return sum;
      }, 0);
      avgResponseTime = totalResponseTime / recentModerations.length / (1000 * 60 * 60); // Convert to hours
    }

    // Calculate moderation rate (comments moderated per day in last 7 days)
    const moderationRate = recentModerations.length / 7;

    return {
      pending,
      flagged,
      approved,
      rejected,
      totalReports,
      avgResponseTime: Math.round(avgResponseTime * 100) / 100, // Round to 2 decimal places
      moderationRate: Math.round(moderationRate * 100) / 100,
    };
  }

  async getCommentDetails(commentId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            createdAt: true,
          },
        },
        reports: {
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
        },
        moderator: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Get target information
    let target = null;
    try {
      switch (comment.targetType) {
        case CommentTargetType.EVENT:
          target = await this.prisma.event.findUnique({
            where: { id: comment.targetId },
            select: { id: true, title: true, description: true },
          });
          break;
        case CommentTargetType.NEWS:
          target = await this.prisma.news.findUnique({
            where: { id: comment.targetId },
            select: { id: true, title: true, description: true },
          });
          break;
        case CommentTargetType.SUBMISSION:
          target = await this.prisma.submission.findUnique({
            where: { id: comment.targetId },
            select: { id: true, title: true, description: true },
          });
          break;
      }
    } catch (error) {
      // Target might have been deleted
    }

    return {
      ...comment,
      target,
      reports: comment.reports.map(report => ({
        id: report.id,
        reason: report.reason,
        description: report.description || '',
        reportedAt: report.createdAt,
        reportedBy: report.reporter,
      })),
    };
  }

  async moderateComment(
    commentId: string,
    action: CommentStatus,
    moderationNote: string,
    moderatorId: string
  ) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    const updatedComment = await this.prisma.comment.update({
      where: { id: commentId },
      data: {
        status: action,
        moderationNote,
        moderatedBy: moderatorId,
        moderatedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Create audit log entry
    await this.prisma.auditLog.create({
      data: {
        userId: moderatorId,
        action: 'MODERATE_COMMENT',
        resource: 'comment',
        resourceId: commentId,
        details: {
          previousStatus: comment.status,
          newStatus: action,
          moderationNote,
        },
      },
    });

    return updatedComment;
  }

  // Sensitive Words Management
  async getSensitiveWords(filters: any) {
    const result = await this.sensitiveWordsService.findAll(filters);
    
    // Add detection statistics for each word
    const wordsWithStats = await Promise.all(
      result.words.map(async (word) => {
        // Count how many times this word has been detected
        const detectionCount = await this.prisma.comment.count({
          where: {
            sensitiveFlags: {
              has: word.category,
            },
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            },
          },
        });

        return {
          ...word,
          detectionCount,
          detectionRate: detectionCount / 30, // Per day average
        };
      })
    );

    return {
      ...result,
      words: wordsWithStats,
    };
  }

  async getSensitiveWordsStats() {
    const [
      totalWords,
      activeWords,
      categories,
      recentDetections,
      topDetectedCategories
    ] = await Promise.all([
      this.prisma.sensitiveWord.count(),
      this.prisma.sensitiveWord.count({ where: { isActive: true } }),
      this.sensitiveWordsService.getCategories(),
      this.prisma.comment.count({
        where: {
          sensitiveFlags: { isEmpty: false },
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
      }),
      // Skip the groupBy for now due to Prisma limitations with array fields
      Promise.resolve([]),
    ]);

    // Calculate category detection rates
    const categoryStats = await Promise.all(
      categories.map(async (category) => {
        const detectionCount = await this.prisma.comment.count({
          where: {
            sensitiveFlags: { has: category },
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
        });

        const wordCount = await this.prisma.sensitiveWord.count({
          where: { category, isActive: true },
        });

        return {
          category,
          wordCount,
          detectionCount,
          detectionRate: detectionCount / 30,
        };
      })
    );

    return {
      totalWords,
      activeWords,
      categoriesCount: categories.length,
      recentDetections,
      categoryStats,
      topDetectedCategories: [], // Simplified for now
    };
  }

  async testSensitiveWords(content: string) {
    const result = await this.sensitiveWordsService.checkContent(content);
    
    // Add additional context and highlighting information
    return {
      ...result,
      highlightedContent: this.highlightSensitiveWords(content, result.detectedWords),
      recommendations: this.generateModerationRecommendations(result),
    };
  }

  private highlightSensitiveWords(content: string, detectedWords: any[]) {
    let highlightedContent = content;
    
    // Sort by position (descending) to avoid position shifts during replacement
    const sortedWords = detectedWords.sort((a, b) => b.positions[0] - a.positions[0]);
    
    for (const detected of sortedWords) {
      for (const position of detected.positions.reverse()) {
        const wordLength = detected.word.length;
        const before = highlightedContent.substring(0, position);
        const word = highlightedContent.substring(position, position + wordLength);
        const after = highlightedContent.substring(position + wordLength);
        
        highlightedContent = `${before}<mark class="sensitive-word level-${detected.level}" data-category="${detected.category}">${word}</mark>${after}`;
      }
    }
    
    return highlightedContent;
  }

  private generateModerationRecommendations(checkResult: any) {
    const recommendations = [];
    
    if (checkResult.maxLevel >= 4) {
      recommendations.push({
        action: 'reject',
        reason: 'High severity sensitive words detected',
        confidence: 'high',
      });
    } else if (checkResult.maxLevel >= 2) {
      recommendations.push({
        action: 'flag',
        reason: 'Medium severity sensitive words detected',
        confidence: 'medium',
      });
    } else if (checkResult.detectedWords.length > 0) {
      recommendations.push({
        action: 'review',
        reason: 'Low severity sensitive words detected',
        confidence: 'low',
      });
    } else {
      recommendations.push({
        action: 'approve',
        reason: 'No sensitive words detected',
        confidence: 'high',
      });
    }
    
    return recommendations;
  }

  // Advanced Bulk Moderation Tools
  async bulkModerateByFilters(
    filters: ModerationQueueFiltersDto,
    action: CommentStatus,
    moderationNote: string,
    moderatorId: string
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    // First, get all comments matching the filters
    const { comments } = await this.getModerationQueue({ ...filters, limit: 1000 });
    const commentIds = comments.map(c => c.id);

    return this.bulkModerateComments(
      { commentIds, action, moderationNote },
      moderatorId
    );
  }

  async getAutomationRules() {
    // Return predefined automation rules
    return [
      {
        id: 'auto-reject-severe',
        name: 'Auto-reject Severe Content',
        description: 'Automatically reject comments with severity level 4 or higher',
        condition: 'maxSeverityLevel >= 4',
        action: CommentStatus.REJECTED,
        isActive: true,
      },
      {
        id: 'auto-flag-medium',
        name: 'Auto-flag Medium Severity',
        description: 'Automatically flag comments with severity level 2-3',
        condition: 'maxSeverityLevel >= 2 && maxSeverityLevel < 4',
        action: CommentStatus.FLAGGED,
        isActive: true,
      },
      {
        id: 'auto-approve-clean',
        name: 'Auto-approve Clean Content',
        description: 'Automatically approve comments with no sensitive words',
        condition: 'maxSeverityLevel === 0',
        action: CommentStatus.APPROVED,
        isActive: false, // Disabled by default for safety
      },
    ];
  }

  async applyAutomationRules(moderatorId: string) {
    const rules = await this.getAutomationRules();
    const activeRules = rules.filter(rule => rule.isActive);
    
    let totalProcessed = 0;
    const results = [];

    for (const rule of activeRules) {
      let processed = 0;
      
      if (rule.id === 'auto-reject-severe') {
        // Find comments with high severity sensitive words
        const comments = await this.prisma.comment.findMany({
          where: {
            status: CommentStatus.PENDING,
            sensitiveFlags: { isEmpty: false },
          },
          include: {
            user: true,
          },
        });

        for (const comment of comments) {
          // Check if comment has severe sensitive words
          const checkResult = await this.sensitiveWordsService.checkContent(comment.content);
          if (checkResult.maxLevel >= 4) {
            await this.moderateComment(
              comment.id,
              CommentStatus.REJECTED,
              `Auto-rejected: ${rule.description}`,
              moderatorId
            );
            processed++;
          }
        }
      } else if (rule.id === 'auto-flag-medium') {
        // Find comments with medium severity sensitive words
        const comments = await this.prisma.comment.findMany({
          where: {
            status: CommentStatus.PENDING,
            sensitiveFlags: { isEmpty: false },
          },
        });

        for (const comment of comments) {
          const checkResult = await this.sensitiveWordsService.checkContent(comment.content);
          if (checkResult.maxLevel >= 2 && checkResult.maxLevel < 4) {
            await this.moderateComment(
              comment.id,
              CommentStatus.FLAGGED,
              `Auto-flagged: ${rule.description}`,
              moderatorId
            );
            processed++;
          }
        }
      } else if (rule.id === 'auto-approve-clean') {
        // Find clean comments
        const comments = await this.prisma.comment.findMany({
          where: {
            status: CommentStatus.PENDING,
            sensitiveFlags: { isEmpty: true },
          },
        });

        for (const comment of comments) {
          const checkResult = await this.sensitiveWordsService.checkContent(comment.content);
          if (checkResult.isClean) {
            await this.moderateComment(
              comment.id,
              CommentStatus.APPROVED,
              `Auto-approved: ${rule.description}`,
              moderatorId
            );
            processed++;
          }
        }
      }

      results.push({
        ruleId: rule.id,
        ruleName: rule.name,
        processed,
      });
      totalProcessed += processed;
    }

    return {
      totalProcessed,
      results,
      appliedRules: activeRules.length,
    };
  }

  async getModerationPerformanceMetrics(moderatorId?: string, days: number = 30) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const where: any = {
      moderatedAt: { gte: startDate },
    };
    
    if (moderatorId) {
      where.moderatedBy = moderatorId;
    }

    const [
      totalModerated,
      approved,
      rejected,
      flagged,
      avgResponseTime,
      moderatorStats
    ] = await Promise.all([
      this.prisma.comment.count({ where }),
      this.prisma.comment.count({ where: { ...where, status: CommentStatus.APPROVED } }),
      this.prisma.comment.count({ where: { ...where, status: CommentStatus.REJECTED } }),
      this.prisma.comment.count({ where: { ...where, status: CommentStatus.FLAGGED } }),
      this.calculateAverageResponseTime(where),
      this.getModeratorsPerformance(startDate),
    ]);

    return {
      period: `Last ${days} days`,
      totalModerated,
      breakdown: {
        approved,
        rejected,
        flagged,
      },
      avgResponseTime,
      moderationRate: totalModerated / days,
      moderatorStats: moderatorId ? moderatorStats.find(m => m.moderatorId === moderatorId) : moderatorStats,
    };
  }

  private async calculateAverageResponseTime(where: any) {
    const comments = await this.prisma.comment.findMany({
      where,
      select: {
        createdAt: true,
        moderatedAt: true,
      },
    });

    if (comments.length === 0) return 0;

    const totalResponseTime = comments.reduce((sum, comment) => {
      if (comment.moderatedAt) {
        return sum + (comment.moderatedAt.getTime() - comment.createdAt.getTime());
      }
      return sum;
    }, 0);

    return totalResponseTime / comments.length / (1000 * 60 * 60); // Convert to hours
  }

  private async getModeratorsPerformance(startDate: Date) {
    const moderators = await this.prisma.comment.groupBy({
      by: ['moderatedBy'],
      where: {
        moderatedAt: { gte: startDate },
        moderatedBy: { not: null },
      },
      _count: { moderatedBy: true },
    });

    return Promise.all(
      moderators.map(async (mod: any) => {
        const moderator = await this.prisma.user.findUnique({
          where: { id: mod.moderatedBy },
          select: { username: true, firstName: true, lastName: true },
        });

        const [approved, rejected, flagged] = await Promise.all([
          this.prisma.comment.count({
            where: {
              moderatedBy: mod.moderatedBy,
              moderatedAt: { gte: startDate },
              status: CommentStatus.APPROVED,
            },
          }),
          this.prisma.comment.count({
            where: {
              moderatedBy: mod.moderatedBy,
              moderatedAt: { gte: startDate },
              status: CommentStatus.REJECTED,
            },
          }),
          this.prisma.comment.count({
            where: {
              moderatedBy: mod.moderatedBy,
              moderatedAt: { gte: startDate },
              status: CommentStatus.FLAGGED,
            },
          }),
        ]);

        return {
          moderatorId: mod.moderatedBy,
          moderator,
          totalModerated: mod._count.moderatedBy,
          breakdown: { approved, rejected, flagged },
        };
      })
    );
  }
}