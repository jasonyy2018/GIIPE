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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SensitiveWordsService } from './sensitive-words.service';
import { CreateSensitiveWordDto } from './dto/create-sensitive-word.dto';
import { UpdateSensitiveWordDto } from './dto/update-sensitive-word.dto';
import { SensitiveWordFiltersDto } from './dto/sensitive-word-filters.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('sensitive-words')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class SensitiveWordsController {
  constructor(private readonly sensitiveWordsService: SensitiveWordsService) {}

  @Post()
  create(@Body() createSensitiveWordDto: CreateSensitiveWordDto) {
    return this.sensitiveWordsService.create(createSensitiveWordDto);
  }

  @Get()
  findAll(@Query() filters: SensitiveWordFiltersDto) {
    return this.sensitiveWordsService.findAll(filters);
  }

  @Get('categories')
  getCategories() {
    return this.sensitiveWordsService.getCategories();
  }

  @Post('check')
  @Roles(UserRole.ADMIN, UserRole.EDITOR) // Allow editors to check content
  checkContent(@Body('content') content: string) {
    return this.sensitiveWordsService.checkContent(content);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async importWords(
    @UploadedFile() file: any,
    @Body('words') wordsJson?: string,
  ) {
    let words: Array<{ word: string; level: number; category?: string }> = [];

    if (file) {
      // Handle file upload (CSV or JSON)
      const content = file.buffer.toString('utf-8');
      
      if (file.mimetype === 'application/json') {
        words = JSON.parse(content);
      } else if (file.mimetype === 'text/csv') {
        // Simple CSV parsing: word,level,category
        const lines = content.split('\n').slice(1); // Skip header
        words = lines
          .filter(line => line.trim())
          .map(line => {
            const [word, level, category] = line.split(',').map(s => s.trim());
            return {
              word,
              level: parseInt(level) || 1,
              category: category || 'general',
            };
          });
      }
    } else if (wordsJson) {
      words = JSON.parse(wordsJson);
    }

    return this.sensitiveWordsService.importWords(words);
  }

  @Get('export')
  exportWords() {
    return this.sensitiveWordsService.exportWords();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sensitiveWordsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSensitiveWordDto: UpdateSensitiveWordDto) {
    return this.sensitiveWordsService.update(id, updateSensitiveWordDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.sensitiveWordsService.remove(id);
  }

  // Enhanced management endpoints
  @Get('admin/categories')
  getWordCategories() {
    return this.sensitiveWordsService.getWordCategories();
  }

  @Get('admin/statistics')
  getWordStatistics() {
    return this.sensitiveWordsService.getWordStatistics();
  }

  @Post('admin/bulk-update')
  bulkUpdateWords(@Body() body: { wordIds: string[]; updates: Partial<any> }) {
    return this.sensitiveWordsService.bulkUpdateWords(body.wordIds, body.updates);
  }

  @Post('admin/test')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  testContent(@Body('content') content: string) {
    return this.sensitiveWordsService.testContentAgainstFilters(content);
  }

  // Word list versioning endpoints
  @Post('admin/versions')
  createWordListVersion(@Body('description') description: string) {
    return this.sensitiveWordsService.createWordListVersion(description);
  }

  @Get('admin/versions')
  getWordListVersions() {
    return this.sensitiveWordsService.getWordListVersions();
  }

  @Post('admin/versions/:versionId/restore')
  restoreWordListVersion(@Param('versionId') versionId: string) {
    return this.sensitiveWordsService.restoreWordListVersion(versionId);
  }

  // Enhanced import/export with different formats
  @Post('admin/import')
  async importWordsAdvanced(@Body() body: { data: string; format: 'csv' | 'json' }) {
    let words: Array<{ word: string; level: number; category?: string }> = [];

    if (body.format === 'json') {
      words = JSON.parse(body.data);
    } else if (body.format === 'csv') {
      // Parse CSV: word,level,category
      const lines = body.data.split('\n').filter(line => line.trim());
      const hasHeader = lines[0].toLowerCase().includes('word');
      const dataLines = hasHeader ? lines.slice(1) : lines;
      
      words = dataLines.map(line => {
        const [word, level, category] = line.split(',').map(s => s.trim());
        return {
          word,
          level: parseInt(level) || 1,
          category: category || 'general',
        };
      });
    }

    return this.sensitiveWordsService.importWords(words);
  }
}