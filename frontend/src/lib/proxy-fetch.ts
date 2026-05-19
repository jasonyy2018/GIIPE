/**
 * Upstream (Nest) proxy helper for Next.js Route Handlers.
 *
 * - **read** (GET/HEAD): timeout + retries on timeout and common connection errors (safe to repeat).
 * - **write** (POST/PATCH/PUT/DELETE): timeout + **at most one** retry, only on clear *pre-response*
 *   connection failures (e.g. ECONNRESET). **Never** retry on client abort/timeout — avoids duplicate
 *   side effects when the server may have already accepted the body.
 *
 * Tune via env:
 * - SERVER_API_TIMEOUT (ms, default 4000)
 * - SERVER_API_RETRIES (read extra attempts, default 1 → up to 2 tries total)
 * - SERVER_API_WRITE_RETRIES (0 = off, 1 = one retry on connection reset; default 1, capped at 1)
 */

function safeEnvNumber(raw: string | undefined, fallback: number): number {
  const v = Number(raw);
  return Number.isFinite(v) && v >= 0 ? v : fallback;
}

const DEFAULT_READ_TIMEOUT_MS = safeEnvNumber(process.env.SERVER_API_TIMEOUT, 4000);
const DEFAULT_READ_RETRIES = safeEnvNumber(process.env.SERVER_API_RETRIES, 1);
const DEFAULT_WRITE_RETRIES = Math.min(
  1,
  Math.max(0, safeEnvNumber(process.env.SERVER_API_WRITE_RETRIES, 1)),
);

export type ProxyFetchMode = 'read' | 'write';

export type ProxyFetchOptions = {
  timeoutMs?: number;
  /** Extra attempts after the first try (total tries = retries + 1) */
  retries?: number;
  label?: string;
  /** If omitted, inferred from `init.method` (GET/HEAD → read, else → write). */
  mode?: ProxyFetchMode;
};

function inferMode(init: RequestInit): ProxyFetchMode {
  const m = (init.method || 'GET').toUpperCase();
  return m === 'GET' || m === 'HEAD' ? 'read' : 'write';
}

function isConnectionLevelError(error: Error): boolean {
  const message = error.message || '';
  const cause = (error as any).cause;
  const causeMessage =
    typeof cause?.message === 'string' ? cause.message : String(cause || '');
  const code = cause && typeof cause === 'object' ? (cause as NodeJS.ErrnoException).code : undefined;

  return (
    message.includes('fetch failed') ||
    message.includes('ECONNRESET') ||
    message.includes('ECONNREFUSED') ||
    message.includes('EPIPE') ||
    causeMessage.includes('ECONNRESET') ||
    causeMessage.includes('ECONNREFUSED') ||
    causeMessage.includes('EPIPE') ||
    code === 'ECONNRESET' ||
    code === 'ECONNREFUSED' ||
    code === 'EPIPE'
  );
}

/** Read: also retry on timeout (AbortError) — safe for GET/HEAD. */
function isRetryableReadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.name === 'AbortError') return true;
  return isConnectionLevelError(error);
}

/** Write: never retry on timeout; only connection-level failures before a response. */
function isRetryableWriteError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.name === 'AbortError') return false;
  return isConnectionLevelError(error);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Low-level: prefer `backendProxyFetch` in route handlers unless you need explicit mode override.
 */
export async function proxyFetchWithRetry(
  url: string,
  init: RequestInit,
  options: ProxyFetchOptions = {},
): Promise<Response> {
  const mode = options.mode ?? inferMode(init);
  const timeoutMs = options.timeoutMs ?? DEFAULT_READ_TIMEOUT_MS;
  const maxExtraAttempts =
    mode === 'read'
      ? (options.retries ?? DEFAULT_READ_RETRIES)
      : Math.min(1, options.retries ?? DEFAULT_WRITE_RETRIES);
  const label = options.label || 'proxy';

  let lastError: unknown;
  for (let attempt = 0; attempt <= maxExtraAttempts; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
        cache: 'no-store',
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error;

      const retryable =
        mode === 'read' ? isRetryableReadError(error) : isRetryableWriteError(error);
      if (!retryable || attempt >= maxExtraAttempts) {
        throw error;
      }

      const delay = Math.min(1500, 250 * (attempt + 1));
      console.warn(
        `[Proxy Fetch] ${label} [${mode}] attempt ${attempt + 1} failed, retrying in ${delay}ms`,
        error instanceof Error ? { message: error.message, cause: (error as any).cause } : error,
      );
      await sleep(delay);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Unknown proxy fetch error');
}

/**
 * Use in Route Handlers instead of raw `fetch` to backend. Method drives read vs write behavior.
 */
export function backendProxyFetch(
  url: string,
  init: RequestInit = {},
  options?: Omit<ProxyFetchOptions, 'mode'>,
): Promise<Response> {
  return proxyFetchWithRetry(url, init, { ...options, mode: inferMode(init) });
}
