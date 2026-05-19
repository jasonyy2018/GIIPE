/**
 * Shared admin session helper for Next.js server routes.
 *
 * Current approach:
 * - If client passes `Authorization: Bearer <jwt>` to `/api/admin/**`,
 *   reuse that token for backend calls.
 * - Otherwise fall back to the historical `mock-token` so existing flows
 *   don't abruptly break.
 */

import { headers } from 'next/headers';

interface AdminSession {
  user: { role: string; email: string; name?: string };
  accessToken: string;
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const h = await headers();
  const authHeader =
    h.get('authorization') ||
    h.get('Authorization') ||
    '';

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1];

  return token
    ? { user: { role: 'ADMIN', email: 'admin@giip.info' }, accessToken: token }
    : { user: { role: 'ADMIN', email: 'admin@giip.info' }, accessToken: 'mock-token' };
}
