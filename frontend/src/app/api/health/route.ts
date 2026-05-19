import { NextResponse } from 'next/server';

/**
 * Health check endpoint for Docker and monitoring
 * Returns 200 OK if the server is healthy
 */
export async function GET() {
  try {
    // Simple health check - just return OK
    // You can add more checks here if needed (database, etc.)
    return NextResponse.json(
      {
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'frontend',
      },
      { status: 200 }
    );
  } catch (error) {
    // If there's an error, return 503 Service Unavailable
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

