import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SecurityConfig {
  jwt: {
    secret: string;
    expiresIn: string;
    refreshExpiresIn: string;
  };
  rateLimit: {
    windowMs: number;
    max: number;
    authMax: number;
  };
  csrf: {
    secret: string;
    enabled: boolean;
  };
  cors: {
    origin: string | string[];
    credentials: boolean;
  };
  helmet: {
    contentSecurityPolicy: {
      directives: Record<string, string[]>;
    };
    hsts: {
      maxAge: number;
      includeSubDomains: boolean;
    };
  };
  validation: {
    whitelist: boolean;
    forbidNonWhitelisted: boolean;
    transform: boolean;
  };
}

@Injectable()
export class SecurityConfigService {
  constructor(private configService: ConfigService) {}

  get config(): SecurityConfig {
    return {
      jwt: {
        secret: this.configService.get<string>('JWT_SECRET', 'default-jwt-secret'),
        expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '8h'),
        refreshExpiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
      },
      rateLimit: {
        windowMs: this.configService.get<number>('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
        max: this.configService.get<number>('RATE_LIMIT_MAX', 100),
        authMax: this.configService.get<number>('RATE_LIMIT_AUTH_MAX', 5),
      },
      csrf: {
        secret: this.configService.get<string>('CSRF_SECRET', 'default-csrf-secret'),
        enabled: this.configService.get<boolean>('CSRF_ENABLED', true),
      },
      cors: {
        origin: this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000'),
        credentials: true,
      },
      helmet: {
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:', 'http://localhost:3001', 'http://localhost:3000'],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
          },
        },
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
        },
      },
      validation: {
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      },
    };
  }

  isProduction(): boolean {
    return this.configService.get<string>('NODE_ENV') === 'production';
  }

  isDevelopment(): boolean {
    return this.configService.get<string>('NODE_ENV') === 'development';
  }
}