import { randomUUID } from 'crypto';

// Ensure crypto.randomUUID is available globally for @nestjs/schedule
if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = {} as any;
}

if (typeof globalThis.crypto.randomUUID === 'undefined') {
  globalThis.crypto.randomUUID = randomUUID;
}

// Also ensure it's available on the global object
if (typeof (global as any).crypto === 'undefined') {
  (global as any).crypto = globalThis.crypto;
}