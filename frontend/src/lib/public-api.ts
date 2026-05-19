import {
  Event,
  PaginatedResponse,
  EventFilters,
  Registration,
  AuthResponse,
  LoginDto,
  RegisterDto,
  User,
  Comment,
  CommentDto,
  Submission,
  EventStatus,
} from '@/types/public';
import { sanitizeForRSC } from '@/lib/rsc-sanitize';

// For client-side: use NEXT_PUBLIC_API_URL (relative path for Next.js API routes)
// For server-side: use SERVER_API_URL (Docker container name)
const API_BASE_URL = typeof window !== 'undefined' 
  ? (process.env.NEXT_PUBLIC_API_URL || '/api')
  : (process.env.SERVER_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001');

class PublicAPI {
  private async fetchWithAuth(endpoint: string, options: RequestInit = {}, isRetry = false): Promise<any> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    
    // In browser: use relative path so requests go through Next.js API proxy routes
    // On server: use full URL with SERVER_API_URL
    let url: string;
    if (typeof window !== 'undefined') {
      url = endpoint;
    } else {
      const serverApiUrl = process.env.SERVER_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      url = `${serverApiUrl}${endpoint}`;
    }
    
    const response = await fetch(url, {
      ...options,
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    // Auto-refresh token on 401 (only once per request)
    if (response.status === 401 && !isRetry && typeof window !== 'undefined') {
      const refreshed = await this.tryRefreshToken();
      if (refreshed) {
        return this.fetchWithAuth(endpoint, options, true);
      }
    }

    if (!response.ok) {
      let errorMessage = `API Error: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch (e) {
        // If response is not JSON, use status text
      }
      
      // Create error with status code for better error handling
      const error = new Error(errorMessage) as Error & { status?: number; code?: string };
      error.status = response.status;
      error.code = response.status === 403 ? 'FORBIDDEN' : response.status === 401 ? 'UNAUTHORIZED' : response.status === 404 ? 'NOT_FOUND' : 'UNKNOWN';
      throw error;
    }

    const data = await response.json();
    // On server, guarantee RSC-safe data (no NaN/Infinity/BigInt/undefined)
    return typeof window === 'undefined' ? sanitizeForRSC(data) : data;
  }

  private async tryRefreshToken(): Promise<boolean> {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) return false;

      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        // Refresh failed — clear auth data
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        return false;
      }

      const data = await response.json();
      localStorage.setItem('authToken', data.accessToken);
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }
      return true;
    } catch {
      return false;
    }
  }

  private async fetchPublic(endpoint: string, options: RequestInit = {}) {
    // In browser: use relative path for Next.js API routes (e.g., /api/events)
    // On server: use full URL with SERVER_API_URL (e.g., http://backend:3001/api/events)
    let url: string;
    if (typeof window !== 'undefined') {
      // Browser: use relative path to Next.js API route
      url = endpoint;
    } else {
      // Server-side: use full URL
      const serverApiUrl = process.env.SERVER_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      url = `${serverApiUrl}${endpoint}`;
    }
    
    // Note: This file is used both in browser (through Next API routes) and server.
    // Keep logs minimal; upstream failures are handled by UI catch blocks.
    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      const error = new Error(errMsg) as Error & { status?: number; code?: string };
      // Network-level failures (ECONNREFUSED / fetch failed) -> treat as upstream unavailable.
      error.status = 503;
      error.code = 'UPSTREAM_UNAVAILABLE';
      throw error;
    }

    if (!response.ok) {
      let errorMessage = `API Error: ${response.status} ${response.statusText}`;
      let errorCode = response.status;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch (e) {
        // If response is not JSON, use status text
      }
      
      // Create error with status code for better error handling
      const error = new Error(errorMessage) as Error & { status?: number; code?: string };
      error.status = errorCode;
      error.code = errorCode === 403 ? 'FORBIDDEN' : errorCode === 404 ? 'NOT_FOUND' : 'UNKNOWN';
      // Mark common reverse-proxy/upstream failures consistently.
      if ([502, 503, 504].includes(errorCode) || /fetch failed/i.test(errorMessage)) {
        error.code = 'UPSTREAM_UNAVAILABLE';
      }
      throw error;
    }

    const data = await response.json();
    return typeof window === 'undefined' ? sanitizeForRSC(data) : data;
  }

  private buildQueryString(params: Record<string, any>): string {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        // Convert page to offset for backend compatibility
        if (key === 'page' && typeof value === 'number') {
          const limit = params.limit || 10;
          const offset = (value - 1) * limit;
          searchParams.append('offset', offset.toString());
        } else if (Array.isArray(value)) {
          value.forEach(v => searchParams.append(key, v.toString()));
        } else {
          searchParams.append(key, value.toString());
        }
      }
    });

    return searchParams.toString();
  }

  // Events API
  async getEvents(filters: EventFilters = {}): Promise<PaginatedResponse<Event>> {
    const queryString = this.buildQueryString(filters);
    console.log('[PublicAPI] Events query string:', queryString);
    return this.fetchPublic(`/api/events?${queryString}`);
  }

  async getEvent(idOrUrl: string): Promise<Event> {
    // Handle both plain ID and ID with query parameters (for cache busting)
    const eventId = idOrUrl.split('?')[0];
    const queryString = idOrUrl.includes('?') ? idOrUrl.split('?')[1] : '';
    const url = queryString ? `/api/events/${eventId}?${queryString}` : `/api/events/${eventId}`;
    return this.fetchPublic(url);
  }

  async getFeaturedEvents(limit: number = 6): Promise<Event[]> {
    // Featured events should only be PUBLISHED events, sorted newest first
    const response = await this.getEvents({
      status: EventStatus.PUBLISHED,
      limit,
      page: 1,
      sortBy: 'startDate',
      sortOrder: 'desc' // Newest first
    });
    return response.events || response.data || [];
  }

  async getPastEvents(limit: number = 6): Promise<Event[]> {
    // Past events sorted newest first
    const response = await this.getEvents({
      status: EventStatus.COMPLETED,
      limit,
      page: 1,
      sortBy: 'endDate',
      sortOrder: 'desc' // Newest first
    });
    return response.events || response.data || [];
  }

  // Authentication API
  async login(credentials: LoginDto): Promise<AuthResponse> {
    const response = await this.fetchPublic('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    // Store token in localStorage
    if (typeof window !== 'undefined' && response.accessToken) {
      localStorage.setItem('authToken', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
    }

    return response;
  }

  async register(userData: RegisterDto): Promise<AuthResponse> {
    const response = await this.fetchPublic('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    // Store token in localStorage
    if (typeof window !== 'undefined' && response.accessToken) {
      localStorage.setItem('authToken', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
    }

    return response;
  }

  async logout(): Promise<void> {
    try {
      await this.fetchWithAuth('/api/auth/logout', {
        method: 'POST',
      });
    } finally {
      // Clear tokens from localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
      }
    }
  }

  async getCurrentUser(): Promise<User> {
    return this.fetchWithAuth('/api/auth/profile');
  }

  async refreshToken(): Promise<AuthResponse> {
    const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await this.fetchPublic('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });

    // Update tokens in localStorage
    if (typeof window !== 'undefined' && response.accessToken) {
      localStorage.setItem('authToken', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
    }

    return response;
  }

  // Registration API
  async registerForEvent(eventId: string, additionalInfo?: Record<string, any>): Promise<Registration> {
    return this.fetchWithAuth('/api/registrations', {
      method: 'POST',
      body: JSON.stringify({ eventId, additionalInfo }),
    });
  }

  async getMyRegistrations(): Promise<Registration[]> {
    return this.fetchWithAuth('/api/registrations/my');
  }

  async cancelRegistration(registrationId: string): Promise<void> {
    await this.fetchWithAuth(`/api/registrations/${registrationId}`, {
      method: 'DELETE',
    });
  }

  // User Profile API
  async updateProfile(profileData: Partial<User>): Promise<User> {
    return this.fetchWithAuth('/api/users/profile', {
      method: 'PATCH',
      body: JSON.stringify(profileData),
    });
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await this.fetchWithAuth('/api/users/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  // Comments API
  async getComments(eventId?: string, newsId?: string): Promise<Comment[]> {
    // Use the public by-target endpoint instead of the admin-only findAll endpoint
    let response: any[];
    if (eventId) {
      response = await this.fetchPublic(`/api/comments/by-target/EVENT/${eventId}?includeReplies=true`);
    } else if (newsId) {
      response = await this.fetchPublic(`/api/comments/by-target/NEWS/${newsId}?includeReplies=true`);
    } else {
      throw new Error('Either eventId or newsId must be provided');
    }
    
    // Transform backend response to match frontend Comment interface
    // Backend returns: { targetType, targetId, status: 'APPROVED' (uppercase), ... }
    // Frontend expects: { eventId/newsId, status: 'approved' (lowercase), ... }
    return response.map((comment: any) => ({
      ...comment,
      // Convert status from uppercase to lowercase
      status: comment.status?.toLowerCase() || 'pending',
      // Map targetType/targetId to eventId/newsId
      ...(comment.targetType === 'EVENT' && { eventId: comment.targetId }),
      ...(comment.targetType === 'NEWS' && { newsId: comment.targetId }),
      // Ensure dates are strings
      createdAt: comment.createdAt instanceof Date ? comment.createdAt.toISOString() : comment.createdAt,
      updatedAt: comment.updatedAt instanceof Date ? comment.updatedAt.toISOString() : comment.updatedAt,
      // Transform replies recursively
      replies: comment.replies?.map((reply: any) => ({
        ...reply,
        status: reply.status?.toLowerCase() || 'pending',
        ...(reply.targetType === 'EVENT' && { eventId: reply.targetId }),
        ...(reply.targetType === 'NEWS' && { newsId: reply.targetId }),
        createdAt: reply.createdAt instanceof Date ? reply.createdAt.toISOString() : reply.createdAt,
        updatedAt: reply.updatedAt instanceof Date ? reply.updatedAt.toISOString() : reply.updatedAt,
      })),
    }));
  }

  async createComment(commentData: CommentDto): Promise<Comment> {
    // Transform frontend CommentDto to backend CreateCommentDto format
    // Frontend uses: { eventId?, newsId?, parentId?, content }
    // Backend expects: { targetType, targetId, parentId?, content }
    const backendData: any = {
      content: commentData.content,
      ...(commentData.parentId && { parentId: commentData.parentId }),
    };
    
    if (commentData.eventId) {
      backendData.targetType = 'EVENT';
      backendData.targetId = commentData.eventId;
    } else if (commentData.newsId) {
      backendData.targetType = 'NEWS';
      backendData.targetId = commentData.newsId;
    } else {
      throw new Error('Either eventId or newsId must be provided');
    }
    
    const response = await this.fetchWithAuth('/api/comments', {
      method: 'POST',
      body: JSON.stringify(backendData),
    });
    
    // Transform backend response to frontend Comment format
    return {
      ...response,
      status: response.status?.toLowerCase() || 'pending',
      ...(response.targetType === 'EVENT' && { eventId: response.targetId }),
      ...(response.targetType === 'NEWS' && { newsId: response.targetId }),
      createdAt: response.createdAt instanceof Date ? response.createdAt.toISOString() : response.createdAt,
      updatedAt: response.updatedAt instanceof Date ? response.updatedAt.toISOString() : response.updatedAt,
    };
  }

  async updateComment(commentId: string, content: string): Promise<Comment> {
    return this.fetchWithAuth(`/api/comments/${commentId}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    });
  }

  async deleteComment(commentId: string): Promise<void> {
    await this.fetchWithAuth(`/api/comments/${commentId}`, {
      method: 'DELETE',
    });
  }

  // Submissions API
  async getMySubmissions(): Promise<Submission[]> {
    return this.fetchWithAuth('/api/submissions/my');
  }

  async createSubmission(formData: FormData): Promise<Submission> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    
    const response = await fetch(`${API_BASE_URL}/submissions`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async deleteSubmission(submissionId: string): Promise<void> {
    await this.fetchWithAuth(`/api/submissions/${submissionId}`, {
      method: 'DELETE',
    });
  }

  // Payment API
  async createPaymentOrder(eventId: string): Promise<{ success: boolean; cashierUrl: string; orderId: string }> {
    const isMobile = typeof window !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    return this.fetchWithAuth('/payment-proxy/create-order', {
      method: 'POST',
      body: JSON.stringify({ eventId, gateway: isMobile ? 'WAP' : 'WEB' }),
    });
  }

  async getOrder(orderId: string): Promise<any> {
    return this.fetchWithAuth(`/payment-proxy/query/${orderId}`);
  }
}

export const publicAPI = new PublicAPI();