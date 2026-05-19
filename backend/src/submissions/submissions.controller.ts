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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { SubmissionsService } from './submissions.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { UpdateSubmissionDto } from './dto/update-submission.dto';
import { SubmissionFiltersDto } from './dto/submission-filters.dto';
import { SubmissionResponseDto, PaginatedSubmissionsDto } from './dto/submission-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { StorageService } from '../storage/storage.service';
import { FileCategory } from '../storage/dto/upload-file.dto';
import { UserRole } from '@prisma/client';

@ApiTags('submissions')
@Controller('submissions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SubmissionsController {
  constructor(
    private readonly submissionsService: SubmissionsService,
    private readonly storageService: StorageService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new submission' })
  @ApiResponse({
    status: 201,
    description: 'Submission created successfully',
    type: SubmissionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async create(
    @Body() createSubmissionDto: CreateSubmissionDto,
    @CurrentUser('id') userId: string,
  ): Promise<SubmissionResponseDto> {
    return this.submissionsService.create(createSubmissionDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all submissions' })
  @ApiResponse({
    status: 200,
    description: 'Submissions retrieved successfully',
    type: PaginatedSubmissionsDto,
  })
  async findAll(
    @Query() filters: SubmissionFiltersDto,
    @CurrentUser('role') userRole: UserRole,
    @CurrentUser('id') currentUserId: string,
  ): Promise<PaginatedSubmissionsDto> {
    return this.submissionsService.findAll(filters, userRole, currentUserId);
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Get submission statistics' })
  @ApiResponse({ status: 200, description: 'Submission statistics retrieved successfully' })
  async getStats(@Query('eventId') eventId?: string): Promise<any> {
    return this.submissionsService.getSubmissionStats(eventId);
  }

  @Get('events/:eventId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Get all submissions for a specific event' })
  @ApiResponse({
    status: 200,
    description: 'Event submissions retrieved successfully',
    type: [SubmissionResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async getEventSubmissions(
    @Param('eventId') eventId: string,
    @CurrentUser('role') userRole: UserRole,
  ): Promise<SubmissionResponseDto[]> {
    return this.submissionsService.getEventSubmissions(eventId, userRole);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific submission' })
  @ApiResponse({
    status: 200,
    description: 'Submission retrieved successfully',
    type: SubmissionResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Submission not found' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('role') userRole: UserRole,
    @CurrentUser('id') currentUserId: string,
  ): Promise<SubmissionResponseDto> {
    return this.submissionsService.findOne(id, userRole, currentUserId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a submission' })
  @ApiResponse({
    status: 200,
    description: 'Submission updated successfully',
    type: SubmissionResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Submission not found' })
  async update(
    @Param('id') id: string,
    @Body() updateSubmissionDto: UpdateSubmissionDto,
    @CurrentUser('role') userRole: UserRole,
    @CurrentUser('id') currentUserId: string,
  ): Promise<SubmissionResponseDto> {
    return this.submissionsService.update(id, updateSubmissionDto, userRole, currentUserId);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit a draft submission for review' })
  @ApiResponse({
    status: 200,
    description: 'Submission submitted successfully',
    type: SubmissionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Submission not found' })
  async submit(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ): Promise<SubmissionResponseDto> {
    return this.submissionsService.submit(id, userId);
  }

  @Post(':id/upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a file for a submission' })
  @ApiResponse({
    status: 200,
    description: 'File uploaded successfully',
    type: SubmissionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Submission not found' })
  async uploadFile(
    @Param('id') id: string,
    @UploadedFile() file: any,
    @CurrentUser('id') userId: string,
  ): Promise<SubmissionResponseDto> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Upload file using storage service
    const uploadResult = await this.storageService.uploadFile(
      file,
      FileCategory.SUBMISSION,
      id,
    );
    
    return this.submissionsService.updateFileInfo(
      id,
      uploadResult.path,
      file.originalname,
      uploadResult.size,
      userId,
    );
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Get download URL for submission file' })
  @ApiResponse({ status: 200, description: 'Download URL retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Submission or file not found' })
  async downloadFile(
    @Param('id') id: string,
    @CurrentUser('role') userRole: UserRole,
    @CurrentUser('id') currentUserId: string,
  ) {
    const submission = await this.submissionsService.findOne(id, userRole, currentUserId);
    
    if (!submission.filePath) {
      throw new BadRequestException('No file attached to this submission');
    }

    const url = await this.storageService.getFileUrl(submission.filePath);
    return { 
      url,
      fileName: submission.fileName,
      fileSize: submission.fileSize,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a submission' })
  @ApiResponse({ status: 204, description: 'Submission deleted successfully' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Submission not found' })
  async remove(
    @Param('id') id: string,
    @CurrentUser('role') userRole: UserRole,
    @CurrentUser('id') currentUserId: string,
  ): Promise<void> {
    return this.submissionsService.remove(id, userRole, currentUserId);
  }
}