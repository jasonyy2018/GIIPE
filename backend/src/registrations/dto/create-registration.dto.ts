import { IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRegistrationDto {
  @ApiProperty({
    description: 'ID of the event to register for',
    example: 'clp123abc456def789',
  })
  @IsString()
  eventId: string;

  @ApiPropertyOptional({
    description: 'Additional information for the registration',
    example: { dietaryRestrictions: 'vegetarian', specialNeeds: 'wheelchair access' },
  })
  @IsOptional()
  @IsObject()
  additionalInfo?: Record<string, any>;
}