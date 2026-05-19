import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Res,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { StorageService } from './storage.service';
import { UploadFileDto, FileCategory } from './dto/upload-file.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('storage')
@Controller('storage')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StorageController {
  private readonly logger = new Logger(StorageController.name);

  constructor(private readonly storageService: StorageService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a file' })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async uploadFile(
    @UploadedFile() file: any,
    @Query('category') category: FileCategory,
    @Query('referenceId') referenceId?: string,
    @Query('customName') customName?: string,
    @CurrentUser('id') userId?: string,
  ) {
    this.logger.log(`Upload request received: category=${category}, hasFile=${!!file}, fileName=${file?.originalname}, userId=${userId}`);
    
    if (!file) {
      this.logger.error('No file provided in upload request');
      throw new BadRequestException('No file provided');
    }

    if (!category) {
      this.logger.error('No category provided in upload request');
      throw new BadRequestException('File category is required');
    }

    try {
      this.logger.log(`Processing file upload: ${file.originalname}, size=${file.size}, mimetype=${file.mimetype}`);
      const result = await this.storageService.uploadFile(file, category, referenceId, customName);
      this.logger.log(`File uploaded successfully: ${result.path}`);
      return result;
    } catch (error) {
      this.logger.error(`Upload failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('url/*path')
  @ApiOperation({ summary: 'Get file URL' })
  @ApiResponse({ status: 200, description: 'File URL retrieved successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getFileUrl(@Param('path') rawPath: string | string[]) {
    const filePath = Array.isArray(rawPath) ? rawPath.join('/') : String(rawPath || '');
    const exists = await this.storageService.fileExists(filePath);
    if (!exists) {
      throw new BadRequestException('File not found');
    }

    const url = await this.storageService.getFileUrl(filePath);
    return { url };
  }

  @Delete('upload')
  @ApiOperation({ summary: 'Delete a file' })
  @ApiResponse({ status: 200, description: 'File deleted successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async deleteFile(@Query('url') url: string) {
    if (!url) {
      throw new BadRequestException('File URL is required');
    }

    // Extract file path from URL
    // URL format: http://localhost:3001/api/uploads/images/filename.jpg
    // or: /api/uploads/images/filename.jpg
    let filePath: string;
    
    try {
      // Try to parse as URL
      const urlObj = new URL(url);
      // Extract path after /api/uploads/
      const match = urlObj.pathname.match(/\/api\/uploads\/(.+)$/);
      if (match) {
        filePath = match[1];
      } else {
        // Try alternative patterns
        const altMatch = urlObj.pathname.match(/\/uploads\/(.+)$/);
        if (altMatch) {
          filePath = altMatch[1];
        } else {
          throw new BadRequestException('Invalid file URL format');
        }
      }
    } catch (error) {
      // If not a valid URL, treat as relative path
      // Remove /api/uploads/ or /uploads/ prefix if present
      filePath = url
        .replace(/^https?:\/\/[^\/]+/, '') // Remove protocol and domain
        .replace(/^\/api\/uploads\//, '')
        .replace(/^api\/uploads\//, '')
        .replace(/^\/uploads\//, '')
        .replace(/^uploads\//, '');
    }

    if (!filePath) {
      throw new BadRequestException('Could not extract file path from URL');
    }

    // Log for debugging
    this.logger.debug(`Delete file request - URL: ${url}, Extracted path: ${filePath}`);

    const exists = await this.storageService.fileExists(filePath);
    if (!exists) {
      this.logger.warn(`File not found: ${filePath}`);
      throw new BadRequestException(`File not found: ${filePath}`);
    }

    await this.storageService.deleteFile(filePath);
    return { message: 'File deleted successfully' };
  }

  @Get('download/*path')
  @ApiOperation({ summary: 'Download a file (requires authentication)' })
  @ApiResponse({ status: 200, description: 'File downloaded successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async downloadFile(
    @Param('path') rawPath: string | string[],
    @Res() res: Response,
  ) {
    const filePath = Array.isArray(rawPath) ? rawPath.join('/') : String(rawPath || '');
    try {
      const exists = await this.storageService.fileExists(filePath);
      if (!exists) {
        throw new BadRequestException('File not found');
      }

      const fileBuffer = await this.storageService.getFile(filePath);
      const fileName = filePath.split('/').pop() || 'file';
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
      res.send(fileBuffer);
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to download file: ${error.message}`);
    }
  }

  @Get('info')
  @ApiOperation({ summary: 'Get storage configuration info' })
  @ApiResponse({ status: 200, description: 'Storage info retrieved successfully' })
  async getStorageInfo() {
    return {
      maxFileSize: this.storageService.getMaxFileSize(),
      allowedMimeTypes: this.storageService.getAllowedMimeTypes(),
      maxFileSizeMB: Math.round(this.storageService.getMaxFileSize() / (1024 * 1024)),
    };
  }
}