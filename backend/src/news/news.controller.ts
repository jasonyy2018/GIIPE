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
  UseInterceptors,
  HttpCode,
  HttpStatus,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { NewsService } from './news.service';
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';
import { NewsFiltersDto } from './dto/news-filters.dto';
import { NewsResponseDto, PaginatedNewsDto } from './dto/news-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CacheInterceptor, CacheTTL } from '../common/interceptors/cache.interceptor';
import { StorageService } from '../storage/storage.service';
import { UserRole } from '@prisma/client';

interface AuthenticatedUser {
  id: string;
  username: string;
  email: string;
  role: UserRole;
}

@Controller('news')
export class NewsController {
  constructor(
    private readonly newsService: NewsService,
    private readonly storageService: StorageService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  async create(
    @Body() createNewsDto: CreateNewsDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<NewsResponseDto> {
    return this.newsService.create(createNewsDto, user.id);
  }

  @Get()
  @Public()
  // @UseInterceptors(CacheInterceptor) // Temporarily disabled due to dependency issue
  // @CacheTTL(300) // Cache for 5 minutes
  async findAll(
    @Query() filters: NewsFiltersDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<PaginatedNewsDto> {
    return this.newsService.findAll(filters, user?.role);
  }

  @Get('featured')
  @Public()
  async getFeatured(@Query('limit') limit?: number): Promise<{ news: NewsResponseDto[] }> {
    const news = await this.newsService.getFeaturedNews(limit);
    return { news };
  }

  @Get('tags')
  @Public()
  async getTags(): Promise<{ tags: string[] }> {
    const tags = await this.newsService.getNewsTags();
    return { tags };
  }

  @Get(':id')
  @Public()
  // @UseInterceptors(CacheInterceptor) // Temporarily disabled due to dependency issue
  // @CacheTTL(300) // Cache for 5 minutes
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<NewsResponseDto> {
    return this.newsService.findOne(id, user?.role);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  async update(
    @Param('id') id: string,
    @Body() updateNewsDto: UpdateNewsDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<NewsResponseDto> {
    return this.newsService.update(id, updateNewsDto, user.id, user.role);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.newsService.remove(id, user.id, user.role);
  }

  @Post(':id/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  async publish(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<NewsResponseDto> {
    return this.newsService.publish(id, user.id, user.role);
  }

  @Get(':id/pdf')
  @UseGuards(JwtAuthGuard)
  async downloadPdf(
    @Param('id') id: string,
    @Res() res: Response,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    const news = await this.newsService.findOne(id);
    if (!news.pdfAttachment) {
      throw new NotFoundException('PDF attachment not found for this news');
    }

    try {
      const fileBuffer = await this.storageService.getFile(news.pdfAttachment);
      const fileName = news.pdfAttachmentName || `news-${id}.pdf`;
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
      res.send(fileBuffer);
    } catch (error) {
      throw new NotFoundException('PDF file not found');
    }
  }
}