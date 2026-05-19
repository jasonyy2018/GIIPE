import { Controller, Get, Options, Param, Res, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import * as path from 'path';
import * as fs from 'fs';

@ApiTags('files')
@Controller('uploads')
export class StaticFilesController {
  private readonly uploadPath: string;

  constructor(private readonly configService: ConfigService) {
    const rawUploadPath = this.configService.get<string>('UPLOAD_PATH', './uploads');
    
    // Ensure path is absolute - same logic as LocalStorageProvider
    let resolvedPath: string;
    if (path.isAbsolute(rawUploadPath)) {
      resolvedPath = path.normalize(rawUploadPath);
    } else {
      resolvedPath = path.resolve(process.cwd(), rawUploadPath);
    }
    
    if (!path.isAbsolute(resolvedPath)) {
      resolvedPath = '/app/uploads';
      console.warn(`[StaticFilesController] Failed to resolve upload path, using fallback: ${resolvedPath}`);
    }
    
    this.uploadPath = resolvedPath;
    // Log the upload path for debugging
    console.log(`[StaticFilesController] Upload path configured: ${this.uploadPath}`);
    console.log(`[StaticFilesController] Current working directory: ${process.cwd()}`);
  }

  @Options('*path')
  @Public()
  async handleOptions(@Res() res: Response) {
    // Handle CORS preflight requests
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.setHeader('Access-Control-Allow-Origin', frontendUrl);
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS, HEAD');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Origin, X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    res.setHeader('Vary', 'Origin');
    return res.status(200).end();
  }

  @Get('*path')
  @Public()
  @ApiOperation({ summary: 'Serve uploaded files' })
  @ApiResponse({ status: 200, description: 'File served successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async serveFile(@Param('path') rawPath: string | string[], @Res() res: Response) {
    // path-to-regexp v8 returns wildcard params as an array of segments
    const filePath = Array.isArray(rawPath) ? rawPath.join('/') : String(rawPath || '');

    const absoluteUploadPath = path.isAbsolute(this.uploadPath) 
      ? this.uploadPath 
      : path.resolve(process.cwd(), this.uploadPath);
    
    const fullPath = path.resolve(absoluteUploadPath, filePath);
    
    console.log(`[StaticFilesController] Requested file: ${filePath}`);
    console.log(`[StaticFilesController] Full path: ${fullPath}`);

    // Security check - ensure the path is within the upload directory
    const resolvedPath = path.resolve(fullPath);
    const resolvedUploadPath = path.resolve(absoluteUploadPath);
    
    if (!resolvedPath.startsWith(resolvedUploadPath)) {
      console.error(`[StaticFilesController] Security check failed: ${resolvedPath} is not within ${resolvedUploadPath}`);
      throw new NotFoundException('File not found');
    }

    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      console.error(`[StaticFilesController] File not found: ${fullPath}`);
      throw new NotFoundException('File not found');
    }

    // Get file stats
    const stats = fs.statSync(fullPath);
    if (!stats.isFile()) {
      throw new NotFoundException('File not found');
    }

    // Set appropriate headers
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.txt': 'text/plain',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
    };

    const mimeType = mimeTypes[ext] || 'application/octet-stream';
    
    // Set CORS headers FIRST, before any other headers
    // This is critical for CORS to work properly
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.setHeader('Access-Control-Allow-Origin', frontendUrl);
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS, HEAD');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Origin, X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Type');
    res.setHeader('Vary', 'Origin'); // Important: tells browser to check Origin header
    
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year cache
    
    // Stream the file
    const fileStream = fs.createReadStream(fullPath);
    fileStream.pipe(res);
  }
}