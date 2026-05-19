import { ApiProperty } from '@nestjs/swagger';
import { RegistrationStatus } from '@prisma/client';

export class RegistrationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  eventId: string;

  @ApiProperty({ enum: RegistrationStatus })
  status: RegistrationStatus;

  @ApiProperty()
  registeredAt: Date;

  @ApiProperty({ required: false })
  additionalInfo?: Record<string, any>;

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
    maxAttendees?: number;
  };

  constructor(registration: any) {
    this.id = registration.id;
    this.userId = registration.userId;
    this.eventId = registration.eventId;
    this.status = registration.status;
    this.registeredAt = registration.registeredAt;
    this.additionalInfo = registration.additionalInfo;
    this.user = registration.user;
    this.event = registration.event;
  }
}

export class PaginatedRegistrationsDto {
  @ApiProperty({ type: [RegistrationResponseDto] })
  data: RegistrationResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  offset: number;

  @ApiProperty()
  hasMore: boolean;

  constructor(data: RegistrationResponseDto[], total: number, limit: number, offset: number) {
    this.data = data;
    this.total = total;
    this.limit = limit;
    this.offset = offset;
    this.hasMore = offset + limit < total;
  }
}