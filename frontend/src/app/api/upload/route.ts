import { NextRequest, NextResponse } from 'next/server';

import { getBackendUrl } from '@/lib/api-config';
import { backendProxyFetch } from '@/lib/proxy-fetch';

// Increase timeout for file uploads (default is 30s, max is 300s)
export const maxDuration = 120;
export const dynamic = 'force-dynamic';

const BACKEND_URL = getBackendUrl();

export async function POST(request: NextRequest) {
  console.log('Upload API called');
  
  try {
    console.log('Getting form data...');
    const formData = await request.formData();
    const { searchParams } = new URL(request.url);
    
    // Get category from query params, default to image (lowercase to match backend enum)
    let category = searchParams.get('category') || 'image';
    // Normalize category to lowercase to match backend enum values
    category = category.toLowerCase();
    const referenceId = searchParams.get('referenceId');
    const customName = searchParams.get('customName');
    
    console.log('Upload params:', { category, referenceId, customName });
    
    // Build query string for backend
    const queryParams = new URLSearchParams({ category });
    if (referenceId) queryParams.append('referenceId', referenceId);
    if (customName) queryParams.append('customName', customName);

    // Use SERVER_API_URL for Docker container networking
    // In Docker, SERVER_API_URL should be set to container name (e.g., http://conference_backend:3001)
    const serverApiUrl = process.env.SERVER_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    // Use SERVER_API_URL if it's a container name (not localhost), otherwise use BACKEND_URL
    const backendUrl = serverApiUrl && !serverApiUrl.includes('localhost') ? serverApiUrl : BACKEND_URL;

    console.log('Backend URL:', backendUrl);
    console.log('Upload URL:', `${backendUrl}/api/storage/upload?${queryParams.toString()}`);
    
    // Get Authorization header from request
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader) {
      console.error('No Authorization header found in upload request');
      return NextResponse.json(
        { message: 'Authentication required. Please log in again.' },
        { status: 401 }
      );
    }
    
    // Prepare headers for upload request
    const uploadHeaders: Record<string, string> = {
      'Authorization': authHeader,
    };
    
    console.log('Upload headers:', { 
      hasAuth: !!authHeader, 
      authPrefix: authHeader.substring(0, 20) + '...' 
    });
    
    console.log('Sending request to backend...');
    const response = await backendProxyFetch(`${backendUrl}/api/storage/upload?${queryParams.toString()}`, {
      method: 'POST',
      headers: uploadHeaders,
      body: formData,
    });

    console.log('Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend upload failed:', response.status, errorText);
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { message: errorText || 'Upload failed' };
      }
      
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    console.log('Backend response data:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { 
        message: 'Internal server error', 
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  console.log('Delete API called');
  
  try {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');
    
    if (!imageUrl) {
      return NextResponse.json({ message: 'Image URL is required' }, { status: 400 });
    }

    // Extract file path from URL
    // URL format: http://localhost:3001/api/uploads/images/filename.jpg
    // Path format: images/filename.jpg
    let filePath: string = imageUrl;
    try {
      const urlObj = new URL(imageUrl);
      // Remove leading /api/uploads/ from pathname
      const pathname = urlObj.pathname;
      if (pathname.startsWith('/api/uploads/')) {
        filePath = pathname.substring('/api/uploads/'.length);
      } else if (pathname.startsWith('/uploads/')) {
        filePath = pathname.substring('/uploads/'.length);
      } else {
        // If it's already a relative path, use it as is
        filePath = pathname.startsWith('/') ? pathname.substring(1) : pathname;
      }
    } catch (e) {
      // If URL parsing fails, try to extract path directly
      if (imageUrl.includes('/api/uploads/')) {
        filePath = imageUrl.split('/api/uploads/')[1];
      } else if (imageUrl.includes('/uploads/')) {
        filePath = imageUrl.split('/uploads/')[1];
      } else {
        filePath = imageUrl;
      }
    }

    console.log('Extracted file path:', filePath);

    // Use SERVER_API_URL for Docker container networking
    const serverApiUrl = process.env.SERVER_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const backendUrl = serverApiUrl && !serverApiUrl.includes('localhost') ? serverApiUrl : BACKEND_URL;

    console.log('Backend URL:', backendUrl);

    // IMPORTANT: Backend delete endpoint is DELETE /api/storage/upload?url=<original-url>
    // NOT a REST-style path. The backend's StorageController extracts the file path from the URL query param.
    // Passing the original imageUrl (full URL or relative path) is what the backend expects.
    const deleteUrl = `${backendUrl}/api/storage/upload?url=${encodeURIComponent(imageUrl)}`;
    console.log('Delete URL:', deleteUrl);
    
    // Prepare headers for delete request
    const deleteHeaders: Record<string, string> = {
      'Authorization': request.headers.get('Authorization') || '',
    };
    
    console.log('Delete headers:', deleteHeaders);
    
    const response = await backendProxyFetch(deleteUrl, {
      method: 'DELETE',
      headers: deleteHeaders,
    });

    console.log('Backend delete response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend delete failed:', response.status, errorText);
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { message: errorText || 'Delete failed' };
      }
      
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    console.log('Backend delete response data:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { 
        message: 'Internal server error', 
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
