import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageProvider } from '../interfaces/storage.interface';
import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class S3StorageProvider implements StorageProvider {
  private readonly logger = new Logger(S3StorageProvider.name);
  private readonly s3Client: S3Client | null;
  private readonly bucketName: string;
  private readonly region: string;
  private readonly isConfigured: boolean;

  constructor(private readonly configService: ConfigService) {
    // Check if S3 storage is actually being used
    const storageType = this.configService.get<string>('STORAGE_TYPE', 'local').toLowerCase();
    
    // Get and trim all configuration values
    this.bucketName = (this.configService.get<string>('AWS_S3_BUCKET') || '').trim();
    this.region = (this.configService.get<string>('AWS_REGION') || '').trim();
    const accessKeyId = (this.configService.get<string>('AWS_ACCESS_KEY_ID') || '').trim();
    const secretAccessKey = (this.configService.get<string>('AWS_SECRET_ACCESS_KEY') || '').trim();

    // Check if S3 is properly configured - ensure all values are non-empty after trimming
    // Validate that region is a valid non-empty string (AWS regions are typically 2-20 chars)
    // Region should match pattern like us-east-1, eu-west-1, etc. (letters, numbers, hyphens)
    const hasValidRegion = this.region && 
      this.region.length >= 2 && 
      this.region.length <= 20 &&
      /^[a-z0-9-]+$/.test(this.region.toLowerCase());
    
    this.isConfigured = !!(
      storageType === 's3' &&
      this.bucketName &&
      hasValidRegion &&
      accessKeyId &&
      secretAccessKey
    );

    // Only attempt to create S3Client if all validations pass
    if (this.isConfigured) {
      try {
        // Double-check region is not empty before creating client
        if (!this.region || this.region.trim().length === 0) {
          throw new Error('AWS_REGION cannot be empty');
        }
        
        this.s3Client = new S3Client({
          region: this.region,
          credentials: {
            accessKeyId,
            secretAccessKey,
          },
        });
        this.logger.log(`S3 storage provider initialized with region: ${this.region}`);
      } catch (error) {
        this.logger.error(`Failed to initialize S3 client: ${error.message}`, error);
        this.s3Client = null;
        this.isConfigured = false;
      }
    } else {
      this.s3Client = null;
      if (storageType === 's3') {
        this.logger.warn('S3 storage provider not configured. Missing AWS credentials or region.');
      } else {
        this.logger.debug('S3 storage provider not initialized (STORAGE_TYPE is not "s3")');
      }
    }
  }

  async upload(file: any, filePath: string): Promise<string> {
    if (!this.isConfigured || !this.s3Client) {
      throw new Error('S3 storage is not configured. Please set AWS_S3_BUCKET, AWS_REGION, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY.');
    }

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: filePath,
        Body: file.buffer,
        ContentType: file.mimetype,
        ContentLength: file.size,
      });

      await this.s3Client.send(command);
      this.logger.log(`File uploaded to S3: ${filePath}`);
      return filePath;
    } catch (error) {
      this.logger.error(`Error uploading file to S3: ${error.message}`, error);
      throw new Error(`Failed to upload file to S3: ${error.message}`);
    }
  }

  async delete(filePath: string): Promise<void> {
    if (!this.isConfigured || !this.s3Client) {
      throw new Error('S3 storage is not configured. Please set AWS_S3_BUCKET, AWS_REGION, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY.');
    }

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: filePath,
      });

      await this.s3Client.send(command);
      this.logger.log(`File deleted from S3: ${filePath}`);
    } catch (error) {
      this.logger.error(`Error deleting file from S3: ${error.message}`, error);
      throw new Error(`Failed to delete file from S3: ${error.message}`);
    }
  }

  async getUrl(filePath: string): Promise<string> {
    if (!this.isConfigured) {
      throw new Error('S3 storage is not configured. Please set AWS_S3_BUCKET, AWS_REGION, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY.');
    }
    return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${filePath}`;
  }

  async exists(filePath: string): Promise<boolean> {
    if (!this.isConfigured || !this.s3Client) {
      return false;
    }

    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: filePath,
      });

      await this.s3Client.send(command);
      return true;
    } catch {
      return false;
    }
  }

  async getFile(filePath: string): Promise<Buffer> {
    if (!this.isConfigured || !this.s3Client) {
      throw new Error('S3 storage is not configured.');
    }

    try {
      const { GetObjectCommand } = await import('@aws-sdk/client-s3');
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: filePath,
      });

      const response = await this.s3Client.send(command);
      const chunks: Uint8Array[] = [];
      
      if (response.Body) {
        for await (const chunk of response.Body as any) {
          chunks.push(chunk);
        }
      }

      return Buffer.concat(chunks);
    } catch (error) {
      this.logger.error(`Error reading file from S3: ${error.message}`, error);
      throw new Error(`Failed to read file from S3: ${error.message}`);
    }
  }
}