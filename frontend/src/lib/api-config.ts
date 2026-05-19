/**
 * Get backend API URL for server-side API routes
 * 
 * Priority:
 * 1. SERVER_API_URL (for Docker container networking - e.g., http://backend:3001)
 * 2. NEXT_PUBLIC_API_URL (for local development)
 * 3. NEXT_PUBLIC_BACKEND_URL (alternative env var)
 * 4. http://backend:3001 (Docker fallback - container name)
 * 5. http://localhost:3001 (local development fallback)
 * 
 * In Docker, SERVER_API_URL should be set to http://backend:3001
 * This ensures container-to-container communication works correctly
 */
export function getBackendUrl(): string {
  // In Docker, prefer SERVER_API_URL (container name)
  // If not set, try to detect Docker environment and use container name
  if (process.env.SERVER_API_URL) {
    return process.env.SERVER_API_URL;
  }
  
  // Check if we're in Docker (Next.js standalone mode)
  // In Docker, use container name instead of localhost
  if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_API_URL?.includes('localhost')) {
    // Likely in Docker, use container name
    return 'http://backend:3001';
  }
  
  // Fallback to environment variables or localhost
  return (
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    'http://localhost:3001'
  );
}

/**
 * Get backend API URL for client-side code (browser)
 * 
 * This should always use NEXT_PUBLIC_API_URL as browsers
 * cannot access Docker container names
 */
export function getClientBackendUrl(): string {
  return (
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    'http://localhost:3001'
  );
}

