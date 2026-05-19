import { ApiProperty } from '@nestjs/swagger';
import { SubmissionStatus } from '@prisma/client';

export class SubmissionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false })
  filePath?: string;

  @ApiProperty({ required: false })
  fileName?: string;

  @ApiProperty({ required: false })
  fileSize?: number;

  @ApiProperty({ enum: SubmissionStatus })
  status: SubmissionStatus;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  eventId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  user: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };

  @ApiProperty()
  event: {
    id: string;
    title: string;
    startDate: Date;
    endDate: Date;
    location?: string;
  };

  constructor(submission: any) {
    this.id = submission.id;
    this.title = submission.title;
    this.description = submission.description;
    this.filePath = submission.filePath;
    this.fileName = submission.fileName;
    this.fileSize = submission.fileSize;
    this.status = submission.status;
    this.userId = submission.userId;
    this.eventId = submission.eventId;
    this.createdAt = submission.createdAt;
    this.updatedAt = submission.updatedAt;
    this.user = submission.user;
    this.event = submission.event;
  }
}

export class PaginatedSubmissionsDto {
  @ApiProperty({ type: [SubmissionResponseDto] })
  data: SubmissionResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  offset: number;

  @ApiProperty()
  hasMore: boolean;

  constructor(data: SubmissionResponseDto[], total: number, limit: number, offset: number) {
    this.data = data;
    this.total = total;
    this.limit = limit;
    this.offset = offset;
    this.hasMore = offset + limit < total;
  }
}