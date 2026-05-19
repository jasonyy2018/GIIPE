import { Logger } from '@nestjs/common';

const logger = new Logger('PreStartCheck');

export function checkEnvironment() {
  const requiredEnvVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'PAYMENT_RSA_PRIVATE_KEY',
    'PAYMENT_GATEWAY_RSA_PUBLIC_KEY',
    'PAYMENT_PARTNER_ID',
    'PAYMENT_DOMAIN'
  ];

  const missing = requiredEnvVars.filter(env => !process.env[env]);

  if (missing.length > 0) {
    console.error('\n\x1b[31m%s\x1b[0m', '================================================');
    console.error('\x1b[31m%s\x1b[0m', '🔥🔥 CRITICAL ERROR: MISSING ENVIRONMENT VARIABLES 🔥🔥');
    console.error('\x1b[31m%s\x1b[0m', 'The following variables are required but missing:');
    missing.forEach(m => console.error(` - ${m}`));
    console.error('\x1b[31m%s\x1b[0m', 'Please update your .env file or Docker environment.');
    console.error('\x1b[31m%s\x1b[0m', '================================================\n');
    process.exit(1);
  }

  logger.log('✅ All required environment variables are present.');
}
