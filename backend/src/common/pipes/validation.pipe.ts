import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
// import sanitize from 'xss';

@Injectable()
export class ValidationPipe implements PipeTransform<any> {
  private readonly logger = new Logger(ValidationPipe.name);

  /** Body keys that may contain intentional HTML inside markdown — never strip all tags (that breaks <br>, <mark>, <span>, tables-as-HTML, etc.). */
  private static readonly PRESERVE_ANGLE_BRACKET_KEYS = new Set([
    'contentMarkdown',
    'contentHtml',
  ]);

  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    // Sanitize input before validation
    const sanitizedValue = this.sanitizeInput(value);

    const object = plainToInstance(metatype, sanitizedValue);
    const errors = await validate(object, {
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      validateCustomDecorators: true,
    });

    if (errors.length > 0) {
      const errorMessages = errors.map(error => {
        const constraints = error.constraints || {};
        const children = error.children || [];
        
        let messages = Object.values(constraints);
        
        // Handle nested validation errors
        if (children.length > 0) {
          const childMessages = children.map(child => 
            Object.values(child.constraints || {})
          ).flat();
          messages = messages.concat(childMessages);
        }
        
        return messages.join(', ');
      }).filter(msg => msg.length > 0);
      
      this.logger.warn(`Validation failed: ${errorMessages.join('; ')}`);
      
      throw new BadRequestException({
        message: errorMessages,
        error: 'Validation failed',
        statusCode: 400,
      });
    }

    return object;
  }

  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

  private sanitizeInput(value: any): any {
    if (typeof value === 'string') {
      return this.sanitizeString(value);
    } else if (Array.isArray(value)) {
      return value.map(item => this.sanitizeInput(item));
    } else if (value && typeof value === 'object') {
      const sanitized: any = {};
      for (const key in value) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
          const v = value[key];
          if (typeof v === 'string' && ValidationPipe.PRESERVE_ANGLE_BRACKET_KEYS.has(key)) {
            sanitized[key] = this.sanitizeRichContentString(v);
          } else {
            sanitized[key] = this.sanitizeInput(v);
          }
        }
      }
      return sanitized;
    }
    return value;
  }

  /**
   * Markdown + embedded HTML fields: do not strip every `<...>` (that removes <br>, <mark>, <span>, …).
   * Dangerous markup is removed here in a targeted way; ContentService still sanitizes on render/save.
   */
  private sanitizeRichContentString(input: string): string {
    let s = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    s = s.replace(/<\/script>/gi, '');
    // Drop common raw event handlers pasted from bad sources (keep simple; full cleanup is in ContentService)
    s = s.replace(/\s+on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
    return s.trim();
  }

  private sanitizeString(input: string): string {
    // Basic XSS protection (simplified)
    let sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    // Remove other potentially dangerous tags
    sanitized = sanitized.replace(/<[^>]*>/g, '');
    
    // Trim whitespace
    sanitized = sanitized.trim();
    
    return sanitized;
  }
}