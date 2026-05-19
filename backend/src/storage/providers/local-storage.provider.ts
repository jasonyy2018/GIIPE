import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageProvider } from '../interfaces/storage.interface';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  private readonly logger = new Logger(LocalStorageProvider.name);
  private readonly uploadPath: string;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    const rawUploadPath = this.configService.get<string>('UPLOAD_PATH', './uploads');
    
    // Ensure path is absolute - if relative, resolve from process.cwd()
    // Always normalize the path to handle edge cases
    let resolvedPath: string;
    if (path.isAbsolute(rawUploadPath)) {
      resolvedPath = path.normalize(rawUploadPath);
    } else {
      // Resolve relative path from current working directory
      resolvedPath = path.resolve(process.cwd(), rawUploadPath);
    }
    
    // Final check: ensure it's absolute
    if (!path.isAbsolute(resolvedPath)) {
      // Fallback: use /app/uploads if resolution failed
      resolvedPath = '/app/uploads';
      this.logger.warn(`Failed to resolve upload path, using fallback: ${resolvedPath}`);
    }
    
    this.uploadPath = resolvedPath;
    
    // Log initialization with absolute path
    this.logger.log(`LocalStorageProvider initialized with upload path: ${this.uploadPath}`);
    this.logger.log(`Current working directory: ${process.cwd()}`);
    this.logger.log(`Raw UPLOAD_PATH config: ${rawUploadPath}`);
    
    // Default to backend URL (port 3001) since this is where files are served from
    this.baseUrl = this.configService.get<string>('BASE_URL', 'http://localhost:3001');
  }

  async upload(file: any, filePath: string): Promise<string> {
    try {
      // this.uploadPath is already absolute (set in constructor)
      // filePath is relative (e.g., "images/filename.jpg")
      
      // Ensure uploadPath is absolute (double-check for safety)
      const absoluteUploadPath = path.isAbsolute(this.uploadPath) 
        ? this.uploadPath 
        : path.resolve(process.cwd(), this.uploadPath);
      
      // Use path.resolve to ensure absolute path (handles edge cases better than path.join)
      const fullPath = path.resolve(absoluteUploadPath, filePath);
      const directory = path.dirname(fullPath);

      // Log paths for debugging
      this.logger.debug(`Uploading file - Upload path: ${absoluteUploadPath}, File path: ${filePath}, Full path: ${fullPath}`);

      // Ensure directory exists with proper permissions
      await fs.mkdir(directory, { recursive: true, mode: 0o755 });

      // Write file
      await fs.writeFile(fullPath, file.buffer);

      // Log the absolute path for debugging
      this.logger.log(`File uploaded to local storage: ${fullPath}`);
      return filePath;
    } catch (error) {
      this.logger.error(`Error uploading file to local storage: ${error.message}`, error);
      this.logger.error(`Upload path: ${this.uploadPath}, File path: ${filePath}, Full path: ${path.resolve(this.uploadPath, filePath)}`);
      this.logger.error(`Current working directory: ${process.cwd()}`);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  async delete(filePath: string): Promise<void> {
    try {
      // Use path.resolve to ensure absolute path
      const fullPath = path.resolve(this.uploadPath, filePath);
      await fs.unlink(fullPath);
      this.logger.log(`File deleted from local storage: ${fullPath}`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        this.logger.error(`Error deleting file from local storage: ${error.message}`, error);
        throw new Error(`Failed to delete file: ${error.message}`);
      }
    }
  }

  async getUrl(filePath: string): Promise<string> {
    return `${this.baseUrl}/api/uploads/${filePath}`;
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      // Use path.resolve to ensure absolute path
      const fullPath = path.resolve(this.uploadPath, filePath);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async getFile(filePath: string): Promise<Buffer> {
    try {
      // Use path.resolve to ensure absolute path
      const fullPath = path.resolve(this.uploadPath, filePath);
      this.logger.debug(`Reading file - Upload path: ${this.uploadPath}, File path: ${filePath}, Full path: ${fullPath}`);
      
      // Check if file exists first
      try {
        await fs.access(fullPath);
      } catch (accessError) {
        this.logger.error(`File does not exist: ${fullPath}`);
        this.logger.error(`Upload path: ${this.uploadPath}, File path: ${filePath}`);
        throw new Error(`File not found: ${filePath}`);
      }
      
      const fileBuffer = await fs.readFile(fullPath);
      this.logger.debug(`File read successfully: ${fullPath} (${fileBuffer.length} bytes)`);
      return fileBuffer;
    } catch (error) {
      this.logger.error(`Error reading file from local storage: ${error.message}`, error);
      throw error;
    }
  }
}