import { IsEnum, IsOptional, IsObject } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { RegistrationStatus } from '@prisma/client';

export class UpdateRegistrationDto {
  @ApiPropertyOptional({
    description: 'Registration status',
    enum: RegistrationStatus,
    example: RegistrationStatus.CONFIRMED,
  })
  @IsOptional()
  @IsEnum(RegistrationStatus)
  status?: RegistrationStatus;

  @ApiPropertyOptional({
    description: 'Additional information for the registration',
    example: { dietaryRestrictions: 'vegetarian', specialNeeds: 'wheelchair access' },
  })
  @IsOptional()
  @IsObject()
  additionalInfo?: Record<string, any>;
}