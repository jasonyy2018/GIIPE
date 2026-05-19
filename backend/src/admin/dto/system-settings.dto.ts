import { IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSystemSettingDto {
  @ApiProperty({ description: 'Setting key' })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({ description: 'Setting value' })
  @IsString()
  @IsNotEmpty()
  value: string;

  @ApiProperty({ description: 'Setting description', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateSystemSettingDto {
  @ApiProperty({ description: 'Setting value' })
  @IsString()
  @IsNotEmpty()
  value: string;

  @ApiProperty({ description: 'Setting description', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}

export class SystemInfoDto {
  @ApiProperty({ description: 'Application version' })
  version: string;

  @ApiProperty({ description: 'Node.js version' })
  nodeVersion: string;

  @ApiProperty({ description: 'Database status' })
  databaseStatus: string;

  @ApiProperty({ description: 'Redis status' })
  redisStatus: string;

  @ApiProperty({ description: 'System uptime' })
  uptime: number;

  @ApiProperty({ description: 'Memory usage' })
  memoryUsage: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };

  @ApiProperty({ description: 'Total users count' })
  totalUsers: number;

  @ApiProperty({ description: 'Total events count' })
  totalEvents: number;

  @ApiProperty({ description: 'Total registrations count' })
  totalRegistrations: number;
}