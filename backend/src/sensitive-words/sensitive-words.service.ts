import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSensitiveWordDto } from './dto/create-sensitive-word.dto';
import { UpdateSensitiveWordDto } from './dto/update-sensitive-word.dto';
import { SensitiveWordFiltersDto } from './dto/sensitive-word-filters.dto';
import { SensitiveCheckResult, DetectedWord } from './dto/sensitive-check-result.dto';
import { DFATrie } from './dfa-trie';
import { SensitiveWord } from '@prisma/client';

@Injectable()
export class SensitiveWordsService implements OnModuleInit {
  private dfaTrie: DFATrie;
  private lastUpdateTime: Date;

  constructor(private prisma: PrismaService) {
    this.dfaTrie = new DFATrie();
    this.lastUpdateTime = new Date(0);
  }

  async onModuleInit() {
    try {
      await this.rebuildTrie();
    } catch (error: any) {
      // If the table doesn't exist yet (migrations not run), log a warning but don't crash
      if (error?.code === 'P2021' || error?.message?.includes('does not exist') || error?.meta?.table === 'public.sensitive_words') {
        console.warn('⚠️  SensitiveWordsService: Database table "sensitive_words" not found.');
        console.warn('   Please run Prisma migrations: npx prisma migrate deploy');
        console.warn('   Or in Docker: docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy');
      } else {
        console.error('❌ SensitiveWordsService: Failed to initialize:', error?.message || error);
      }
      // Don't throw - allow the application to continue without sensitive word filtering
    }
  }

  async create(createSensitiveWordDto: CreateSensitiveWordDto): Promise<SensitiveWord> {
    const sensitiveWord = await this.prisma.sensitiveWord.create({
      data: {
        ...createSensitiveWordDto,
        word: createSensitiveWordDto.word.toLowerCase().trim(),
      },
    });

    // Rebuild trie to include new word
    await this.rebuildTrie();

    return sensitiveWord;
  }

  async findAll(filters: SensitiveWordFiltersDto): Promise<{ words: SensitiveWord[]; total: number }> {
    const { category, level, isActive, search, page = 1, limit = 50 } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (category) where.category = category;
    if (level !== undefined) where.level = level;
    if (isActive !== undefined) where.isActive = isActive;
    if (search) {
      where.word = {
        contains: search,
        mode: 'insensitive',
      };
    }

    const [words, total] = await Promise.all([
      this.prisma.sensitiveWord.findMany({
        where,
        orderBy: [{ level: 'desc' }, { word: 'asc' }],
        skip,
        take: limit,
      }),
      this.prisma.sensitiveWord.count({ where }),
    ]);

    return { words, total };
  }

  async findOne(id: string): Promise<SensitiveWord> {
    const sensitiveWord = await this.prisma.sensitiveWord.findUnique({
      where: { id },
    });

    if (!sensitiveWord) {
      throw new NotFoundException('Sensitive word not found');
    }

    return sensitiveWord;
  }

  async update(id: string, updateSensitiveWordDto: UpdateSensitiveWordDto): Promise<SensitiveWord> {
    const existingWord = await this.findOne(id);

    const updatedWord = await this.prisma.sensitiveWord.update({
      where: { id },
      data: {
        ...updateSensitiveWordDto,
        ...(updateSensitiveWordDto.word && {
          word: updateSensitiveWordDto.word.toLowerCase().trim(),
        }),
      },
    });

    // Rebuild trie if word content changed
    if (updateSensitiveWordDto.word || updateSensitiveWordDto.isActive !== undefined) {
      await this.rebuildTrie();
    }

    return updatedWord;
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id); // Check if exists

    await this.prisma.sensitiveWord.delete({
      where: { id },
    });

    // Rebuild trie after deletion
    await this.rebuildTrie();
  }

  async checkContent(content: string): Promise<SensitiveCheckResult> {
    // Ensure trie is up to date
    await this.ensureTrieUpdated();

    const matches = this.dfaTrie.search(content);
    const detectedWords: DetectedWord[] = [];
    const wordPositions = new Map<string, number[]>();

    // Group matches by word
    for (const match of matches) {
      if (!wordPositions.has(match.word)) {
        wordPositions.set(match.word, []);
        detectedWords.push({
          word: match.word,
          level: match.level,
          category: match.category,
          positions: [],
        });
      }
      wordPositions.get(match.word)!.push(match.start);
    }

    // Update positions in detected words
    detectedWords.forEach(detected => {
      detected.positions = wordPositions.get(detected.word) || [];
    });

    const maxLevel = detectedWords.length > 0 
      ? Math.max(...detectedWords.map(w => w.level))
      : 0;

    return {
      isClean: detectedWords.length === 0,
      detectedWords,
      maxLevel,
      filteredContent: this.filterContent(content, matches),
    };
  }

  async getCategories(): Promise<string[]> {
    const categories = await this.prisma.sensitiveWord.findMany({
      select: { category: true },
      distinct: ['category'],
      where: { isActive: true },
      orderBy: { category: 'asc' },
    });

    return categories.map(c => c.category);
  }

  async importWords(words: Array<{ word: string; level: number; category?: string }>): Promise<{ imported: number; skipped: number }> {
    let imported = 0;
    let skipped = 0;

    for (const wordData of words) {
      try {
        const normalizedWord = wordData.word.toLowerCase().trim();
        
        // Check if word already exists
        const existing = await this.prisma.sensitiveWord.findUnique({
          where: { word: normalizedWord },
        });

        if (existing) {
          skipped++;
          continue;
        }

        await this.prisma.sensitiveWord.create({
          data: {
            word: normalizedWord,
            level: Math.max(1, Math.min(5, wordData.level)), // Ensure level is 1-5
            category: wordData.category || 'general',
          },
        });

        imported++;
      } catch (error) {
        skipped++;
      }
    }

    // Rebuild trie after import
    if (imported > 0) {
      await this.rebuildTrie();
    }

    return { imported, skipped };
  }

  async exportWords(): Promise<SensitiveWord[]> {
    return this.prisma.sensitiveWord.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { level: 'desc' }, { word: 'asc' }],
    });
  }

  // Enhanced management features
  async getWordCategories(): Promise<Array<{ name: string; count: number; description: string }>> {
    const categories = await this.prisma.sensitiveWord.groupBy({
      by: ['category'],
      _count: { category: true },
      where: { isActive: true },
      orderBy: { category: 'asc' },
    });

    return categories.map(cat => ({
      name: cat.category,
      count: cat._count.category,
      description: this.getCategoryDescription(cat.category),
    }));
  }

  async bulkUpdateWords(wordIds: string[], updates: Partial<SensitiveWord>): Promise<{ updated: number }> {
    const result = await this.prisma.sensitiveWord.updateMany({
      where: { id: { in: wordIds } },
      data: updates,
    });

    // Rebuild trie if active status or word content changed
    if (updates.isActive !== undefined || updates.word || updates.level) {
      await this.rebuildTrie();
    }

    return { updated: result.count };
  }

  async getWordStatistics(): Promise<{
    totalWords: number;
    activeWords: number;
    categoryCounts: Record<string, number>;
    levelCounts: Record<number, number>;
  }> {
    const [
      totalWords,
      activeWords,
      categoryStats,
      levelStats,
    ] = await Promise.all([
      this.prisma.sensitiveWord.count(),
      this.prisma.sensitiveWord.count({ where: { isActive: true } }),
      this.prisma.sensitiveWord.groupBy({
        by: ['category'],
        _count: { category: true },
        where: { isActive: true },
      }),
      this.prisma.sensitiveWord.groupBy({
        by: ['level'],
        _count: { level: true },
        where: { isActive: true },
      }),
    ]);

    const categoryCounts = categoryStats.reduce((acc, stat) => {
      acc[stat.category] = stat._count.category;
      return acc;
    }, {} as Record<string, number>);

    const levelCounts = levelStats.reduce((acc, stat) => {
      acc[stat.level] = stat._count.level;
      return acc;
    }, {} as Record<number, number>);

    return {
      totalWords,
      activeWords,
      categoryCounts,
      levelCounts,
    };
  }

  // Word list versioning (simplified implementation)
  async createWordListVersion(description: string): Promise<any> {
    const words = await this.exportWords();
    
    // In a real implementation, you would store this in a separate table
    // For now, we'll return a mock version object
    const version = {
      id: `version_${Date.now()}`,
      version: `v${Date.now()}`,
      timestamp: new Date().toISOString(),
      description,
      wordCount: words.length,
      changes: {
        added: 0,
        removed: 0,
        modified: 0,
      },
      words, // In production, you might store this separately
    };

    // TODO: Store version in database
    return version;
  }

  async getWordListVersions(): Promise<any[]> {
    // TODO: Retrieve versions from database
    // For now, return empty array
    return [];
  }

  async restoreWordListVersion(versionId: string): Promise<void> {
    // TODO: Implement version restoration
    // This would involve:
    // 1. Retrieve version by ID
    // 2. Clear current words (with backup)
    // 3. Restore words from version
    throw new Error('Version restoration not yet implemented');
  }

  // Enhanced content testing
  async testContentAgainstFilters(content: string): Promise<{
    detectedWords: Array<{ word: string; level: number; category: string; positions: number[] }>;
    maxSeverity: number;
    action: 'allow' | 'flag' | 'block';
    filteredContent: string;
  }> {
    const result = await this.checkContent(content);
    
    let action: 'allow' | 'flag' | 'block' = 'allow';
    if (result.maxLevel >= 4) {
      action = 'block';
    } else if (result.maxLevel >= 2) {
      action = 'flag';
    }

    return {
      detectedWords: result.detectedWords,
      maxSeverity: result.maxLevel,
      action,
      filteredContent: result.filteredContent,
    };
  }

  private getCategoryDescription(category: string): string {
    const descriptions: Record<string, string> = {
      'general': 'General inappropriate content',
      'profanity': 'Profane language and swearing',
      'hate': 'Hate speech and discriminatory language',
      'violence': 'Violent or threatening content',
      'sexual': 'Sexual or adult content',
      'spam': 'Spam and promotional content',
      'personal': 'Personal information and doxxing',
    };

    return descriptions[category.toLowerCase()] || 'Custom category';
  }

  private async rebuildTrie(): Promise<void> {
    this.dfaTrie.clear();

    const activeWords = await this.prisma.sensitiveWord.findMany({
      where: { isActive: true },
    });

    for (const word of activeWords) {
      this.dfaTrie.insert(word.word, word.level, word.category);
    }

    this.dfaTrie.buildFailureLinks();
    this.lastUpdateTime = new Date();
  }

  private async ensureTrieUpdated(): Promise<void> {
    // Check if there are any updates since last rebuild
    const latestUpdate = await this.prisma.sensitiveWord.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    if (latestUpdate && latestUpdate.createdAt > this.lastUpdateTime) {
      await this.rebuildTrie();
    }
  }

  private filterContent(content: string, matches: Array<{ word: string; start: number; end: number }>): string {
    if (matches.length === 0) return content;

    // Sort matches by start position (descending) to replace from end to start
    const sortedMatches = matches.sort((a, b) => b.start - a.start);
    let filteredContent = content;

    for (const match of sortedMatches) {
      const replacement = '*'.repeat(match.word.length);
      filteredContent = 
        filteredContent.substring(0, match.start) + 
        replacement + 
        filteredContent.substring(match.end + 1);
    }

    return filteredContent;
  }
}