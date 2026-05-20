import { NextResponse } from 'next/server';

const MEMORY_WARN_MB = 1536; // ~1.5GB, warn before 2GB Node limit
const MEMORY_CRITICAL_MB = 1792; // ~1.75GB, return 503

interface BackendCheck {
  status: string;
  code?: number;
}

function getMemoryUsageMB(): number {
  const usage = process.memoryUsage();
  return Math.round(usage.heapUsed / 1024 / 1024);
}

function getMemoryCheck(memoryMB: number) {
  return { usedMB: memoryMB, heapTotalMB: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) };
}

async function getBackendCheck(): Promise<BackendCheck> {
  try {
    const serverApiUrl = process.env.SERVER_API_URL || 'http://backend:3001';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const backendRes = await fetch(`${serverApiUrl}/health`, {
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeoutId);
    return { status: backendRes.ok ? 'ok' : 'error', code: backendRes.status };
  } catch {
    return { status: 'unreachable' };
  }
}

/**
 * Health check endpoint for Docker and monitoring
 * - Returns 200 if healthy
 * - Returns 503 if memory is critically high or other checks fail
 */
export async function GET() {
  try {
    const memoryMB = getMemoryUsageMB();
    const backendCheck = await getBackendCheck();

    // Check memory thresholds
    const healthy = memoryMB < MEMORY_CRITICAL_MB && backendCheck.status !== 'error';
    const statusCode = healthy ? 200 : 503;

    if (memoryMB > MEMORY_WARN_MB) {
      console.warn(`[Health] Memory warning: ${memoryMB}MB (threshold: ${MEMORY_WARN_MB}MB)`);
    }

    return NextResponse.json(
      {
        status: healthy ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        service: 'frontend',
        checks: { memory: getMemoryCheck(memoryMB), backend: backendCheck },
      },
      { status: statusCode }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        service: 'frontend',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}

// Allow HEAD requests as well (some health check tools use HEAD)
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}

