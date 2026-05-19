import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RegistrationsService } from './registrations.service';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { UpdateRegistrationDto } from './dto/update-registration.dto';
import { RegistrationFiltersDto } from './dto/registration-filters.dto';
import { RegistrationResponseDto, PaginatedRegistrationsDto } from './dto/registration-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('registrations')
@Controller('registrations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RegistrationsController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  @Post()
  @ApiOperation({ summary: 'Register for an event' })
  @ApiResponse({
    status: 201,
    description: 'Registration created successfully',
    type: RegistrationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async create(
    @Body() createRegistrationDto: CreateRegistrationDto,
    @CurrentUser('id') userId: string,
  ): Promise<RegistrationResponseDto> {
    return this.registrationsService.create(createRegistrationDto, userId);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get current user registrations' })
  @ApiResponse({
    status: 200,
    description: 'User registrations retrieved successfully',
    type: [RegistrationResponseDto],
  })
  async getMyRegistrations(
    @CurrentUser('id') currentUserId: string,
  ): Promise<RegistrationResponseDto[]> {
    const result = await this.registrationsService.findAll(
      { userId: currentUserId } as RegistrationFiltersDto,
      undefined,
      currentUserId,
    );
    return result.data || [];
  }

  @Get()
  @ApiOperation({ summary: 'Get all registrations' })
  @ApiResponse({
    status: 200,
    description: 'Registrations retrieved successfully',
    type: PaginatedRegistrationsDto,
  })
  async findAll(
    @Query() filters: RegistrationFiltersDto,
    @CurrentUser('role') userRole: UserRole,
    @CurrentUser('id') currentUserId: string,
  ): Promise<PaginatedRegistrationsDto> {
    return this.registrationsService.findAll(filters, userRole, currentUserId);
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Get registration statistics' })
  @ApiResponse({ status: 200, description: 'Registration statistics retrieved successfully' })
  async getStats(@Query('eventId') eventId?: string): Promise<any> {
    return this.registrationsService.getRegistrationStats(eventId);
  }

  @Get('events/:eventId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Get all registrations for a specific event' })
  @ApiResponse({
    status: 200,
    description: 'Event registrations retrieved successfully',
    type: [RegistrationResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async getEventRegistrations(
    @Param('eventId') eventId: string,
    @CurrentUser('role') userRole: UserRole,
  ): Promise<RegistrationResponseDto[]> {
    return this.registrationsService.getEventRegistrations(eventId, userRole);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific registration' })
  @ApiResponse({
    status: 200,
    description: 'Registration retrieved successfully',
    type: RegistrationResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Registration not found' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('role') userRole: UserRole,
    @CurrentUser('id') currentUserId: string,
  ): Promise<RegistrationResponseDto> {
    return this.registrationsService.findOne(id, userRole, currentUserId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a registration' })
  @ApiResponse({
    status: 200,
    description: 'Registration updated successfully',
    type: RegistrationResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Registration not found' })
  async update(
    @Param('id') id: string,
    @Body() updateRegistrationDto: UpdateRegistrationDto,
    @CurrentUser('role') userRole: UserRole,
    @CurrentUser('id') currentUserId: string,
  ): Promise<RegistrationResponseDto> {
    return this.registrationsService.update(id, updateRegistrationDto, userRole, currentUserId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel a registration' })
  @ApiResponse({ status: 204, description: 'Registration cancelled successfully' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Registration not found' })
  async remove(
    @Param('id') id: string,
    @CurrentUser('role') userRole: UserRole,
    @CurrentUser('id') currentUserId: string,
  ): Promise<void> {
    return this.registrationsService.remove(id, userRole, currentUserId);
  }
}