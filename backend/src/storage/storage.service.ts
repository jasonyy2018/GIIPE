import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageProvider, UploadResult } from './interfaces/storage.interface';
import { LocalStorageProvider } from './providers/local-storage.provider';
import { S3StorageProvider } from './providers/s3-storage.provider';
import { FileCategory } from './dto/upload-file.dto';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly storageProvider: StorageProvider;
  private readonly maxFileSize: number;
  private readonly allowedMimeTypes: string[];

  constructor(
    private readonly configService: ConfigService,
    private readonly localStorageProvider: LocalStorageProvider,
    private readonly s3StorageProvider: S3StorageProvider,
  ) {
    const storageType = this.configService.get<string>('STORAGE_TYPE', 'local');
    
    switch (storageType) {
      case 's3':
        this.storageProvider = this.s3StorageProvider;
        break;
      case 'local':
      default:
        this.storageProvider = this.localStorageProvider;
        break;
    }

    this.maxFileSize = this.configService.get<number>('MAX_FILE_SIZE', 10 * 1024 * 1024); // 10MB default
    this.allowedMimeTypes = this.configService.get<string>('ALLOWED_MIME_TYPES', 
      'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,image/jpeg,image/png,image/gif'
    ).split(',');
  }

  async uploadFile(
    file: any,
    category: FileCategory,
    referenceId?: string,
    customName?: string,
  ): Promise<UploadResult> {
    try {
      // Validate file
      this.validateFile(file);

      // Generate file path
      const filePath = this.generateFilePath(file, category, referenceId, customName);

      // Upload file
      const storedPath = await this.storageProvider.upload(file, filePath);
      const url = await this.storageProvider.getUrl(storedPath);

      const result: UploadResult = {
        path: storedPath,
        url,
        size: file.size,
        mimeType: file.mimetype,
      };

      this.logger.log(`File uploaded successfully: ${storedPath}`);
      return result;
    } catch (error) {
      this.logger.error(`Error uploading file: ${error.message}`, error.stack);
      // If it's already a BadRequestException, rethrow it
      if (error instanceof BadRequestException) {
        throw error;
      }
      // Otherwise, wrap it in a BadRequestException
      throw new BadRequestException(`Failed to upload file: ${error.message}`);
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      await this.storageProvider.delete(filePath);
      this.logger.log(`File deleted successfully: ${filePath}`);
    } catch (error) {
      this.logger.error(`Error deleting file: ${error.message}`, error);
      throw new BadRequestException(`Failed to delete file: ${error.message}`);
    }
  }

  async getFileUrl(filePath: string): Promise<string> {
    try {
      return await this.storageProvider.getUrl(filePath);
    } catch (error) {
      this.logger.error(`Error getting file URL: ${error.message}`, error);
      throw new BadRequestException(`Failed to get file URL: ${error.message}`);
    }
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      return await this.storageProvider.exists(filePath);
    } catch (error) {
      this.logger.error(`Error checking file existence: ${error.message}`, error);
      return false;
    }
  }

  private validateFile(file: any): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Check file size
    if (file.size > this.maxFileSize) {
      throw new BadRequestException(`File size exceeds maximum allowed size of ${this.maxFileSize / (1024 * 1024)}MB`);
    }

    // Check MIME type
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(`File type ${file.mimetype} is not allowed. Allowed types: ${this.allowedMimeTypes.join(', ')}`);
    }

    // Check for malicious file extensions
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (dangerousExtensions.includes(fileExtension)) {
      throw new BadRequestException(`File extension ${fileExtension} is not allowed for security reasons`);
    }

    // Basic file content validation
    this.validateFileContent(file);
  }

  private validateFileContent(file: any): void {
    // Check for common malicious patterns in file content
    const buffer = file.buffer;
    
    // Skip content validation if buffer is empty
    if (!buffer || buffer.length === 0) {
      return;
    }
    
    // Only validate text-based content, skip binary files like PDFs
    // PDFs are binary files and should not be validated as UTF-8 text
    if (file.mimetype === 'application/pdf') {
      // Skip text content validation for PDFs, only validate headers
      this.validateFileHeaders(file);
      return;
    }
    
    const content = buffer.toString('utf8', 0, Math.min(1024, buffer.length));

    // Check for script tags and other potentially dangerous content
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /vbscript:/i,
      /onload=/i,
      /onerror=/i,
      /eval\(/i,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(content)) {
        throw new BadRequestException('File contains potentially malicious content');
      }
    }

    // Validate file headers for common file types
    this.validateFileHeaders(file);
  }

  private validateFileHeaders(file: any): void {
    const buffer = file.buffer;
    
    // Skip validation if buffer is empty or too small
    if (!buffer || buffer.length < 4) {
      return;
    }
    
    // PDF files should start with %PDF
    if (file.mimetype === 'application/pdf') {
      const pdfHeader = buffer.toString('utf8', 0, 4);
      if (pdfHeader !== '%PDF') {
        throw new BadRequestException('Invalid PDF file format');
      }
    }

    // JPEG files should start with FF D8 FF
    if (file.mimetype === 'image/jpeg') {
      if (!(buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF)) {
        throw new BadRequestException('Invalid JPEG file format');
      }
    }

    // PNG files should start with PNG signature
    if (file.mimetype === 'image/png') {
      const pngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
      for (let i = 0; i < pngSignature.length; i++) {
        if (buffer[i] !== pngSignature[i]) {
          throw new BadRequestException('Invalid PNG file format');
        }
      }
    }
  }

  private generateFilePath(
    file: any,
    category: FileCategory,
    referenceId?: string,
    customName?: string,
  ): string {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const extension = path.extname(file.originalname);
    
    let filename: string;
    if (customName) {
      filename = `${customName}-${timestamp}-${randomString}${extension}`;
    } else {
      const baseName = path.basename(file.originalname, extension);
      filename = `${baseName}-${timestamp}-${randomString}${extension}`;
    }

    // Sanitize filename
    filename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');

    let categoryPath: string;
    switch (category) {
      case FileCategory.SUBMISSION:
        categoryPath = referenceId ? `submissions/${referenceId}` : 'submissions';
        break;
      case FileCategory.AVATAR:
        categoryPath = referenceId ? `avatars/${referenceId}` : 'avatars';
        break;
      case FileCategory.DOCUMENT:
        categoryPath = 'documents';
        break;
      case FileCategory.IMAGE:
        categoryPath = 'images';
        break;
      case FileCategory.PDF:
        categoryPath = referenceId ? `pdfs/${referenceId}` : 'pdfs';
        break;
      default:
        categoryPath = 'misc';
    }

    return `${categoryPath}/${filename}`;
  }

  getMaxFileSize(): number {
    return this.maxFileSize;
  }

  getAllowedMimeTypes(): string[] {
    return this.allowedMimeTypes;
  }

  async getFile(filePath: string): Promise<Buffer> {
    return this.storageProvider.getFile(filePath);
  }
}