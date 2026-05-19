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
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventFiltersDto } from './dto/event-filters.dto';
import { EventResponseDto, PaginatedEventsDto } from './dto/event-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CacheInterceptor, CacheTTL } from '../common/interceptors/cache.interceptor';
import { StorageService } from '../storage/storage.service';
import { UserRole, EventStatus } from '@prisma/client';

interface AuthenticatedUser {
  id: string;
  username: string;
  email: string;
  role: UserRole;
}

@Controller('events')
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly storageService: StorageService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  async create(
    @Body() createEventDto: CreateEventDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<EventResponseDto> {
    return this.eventsService.create(createEventDto, user.id);
  }

  @Get()
  @Public()
  // @UseInterceptors(CacheInterceptor) // Temporarily disabled due to dependency issue
  // @CacheTTL(60) // Cache for 60 seconds
  async findAll(
    @Query() filters: EventFiltersDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<PaginatedEventsDto> {
    return this.eventsService.findAll(filters, user?.role);
  }

  @Get('tags')
  @Public()
  async getTags(): Promise<{ tags: string[] }> {
    const tags = await this.eventsService.getEventTags();
    return { tags };
  }

  @Get(':id')
  @Public()
  // @UseInterceptors(CacheInterceptor) // Temporarily disabled due to dependency issue
  // @CacheTTL(300) // Cache for 5 minutes
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<EventResponseDto> {
    return this.eventsService.findOne(id, user?.role);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  async update(
    @Param('id') id: string,
    @Body() updateEventDto: UpdateEventDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<EventResponseDto> {
    return this.eventsService.update(id, updateEventDto, user.id, user.role);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.eventsService.remove(id, user.id, user.role);
  }

  @Post(':id/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  async publish(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<EventResponseDto> {
    return this.eventsService.publish(id, user.id, user.role);
  }

  @Get(':id/pdf')
  @Public()
  async downloadPdf(
    @Param('id') id: string,
    @Res() res: Response,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<void> {
    const event = await this.eventsService.findOne(id, user?.role);
    if (!event.pdfAttachment) {
      throw new NotFoundException('PDF attachment not found for this event');
    }

    // Check if user can access this event (PUBLISHED and COMPLETED events are publicly accessible)
    const isPublicStatus = event.status === EventStatus.PUBLISHED || event.status === EventStatus.COMPLETED;
    if (!isPublicStatus && user?.role !== UserRole.ADMIN && user?.role !== UserRole.EDITOR) {
      throw new NotFoundException('PDF file not found');
    }

    try {
      const fileBuffer = await this.storageService.getFile(event.pdfAttachment);
      const fileName = event.pdfAttachmentName || `event-${id}.pdf`;
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
      // Path is keyed only by event id; when admins upload a new PDF the URL stays the same — avoid stale CDN/browser caches.
      res.setHeader('Cache-Control', 'private, no-store');
      res.send(fileBuffer);
    } catch (error) {
      throw new NotFoundException('PDF file not found');
    }
  }
}