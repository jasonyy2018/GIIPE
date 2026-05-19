'use client'

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, Calendar, Eye, Trash2, Upload, AlertCircle } from 'lucide-react';
import PublicLayout from '@/components/public/PublicLayout';
import SubmissionUpload from '@/components/public/SubmissionUpload';
import { useAuth } from '@/contexts/AuthContext';
import { Submission } from '@/types/public';
import { publicAPI } from '@/lib/public-api';
import { format } from 'date-fns';

export default function SubmissionsPage() {
  const { user, isAuthenticated } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchSubmissions();
    }
  }, [isAuthenticated]);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const submissionsData = await publicAPI.getMySubmissions();
      setSubmissions(submissionsData);
    } catch (err) {
      console.error('Error fetching submissions:', err);
      setError('Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (submissionId: string) => {
    if (!confirm('Are you sure you want to delete this submission?')) {
      return;
    }

    try {
      await publicAPI.deleteSubmission(submissionId);
      await fetchSubmissions(); // Refresh the list
    } catch (err: any) {
      setError(err.message || 'Failed to delete submission');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'under_review':
        return 'bg-light text-primary-dark';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isAuthenticated) {
    return (
      <PublicLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
            <p className="text-gray-600 mb-8">Please log in to view your submissions.</p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Submissions</h1>
            <p className="text-lg text-gray-600">
              Manage your uploaded documents and track their review status
            </p>
          </div>
          <SubmissionUpload onSuccess={fetchSubmissions} />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Submissions List */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm border p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-4"></div>
                <div className="h-3 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-32"></div>
              </div>
            ))}
          </div>
        ) : submissions && submissions.length > 0 ? (
          <div className="space-y-6">
            {submissions.map((submission) => (
              <div key={submission.id} className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {submission.title}
                    </h3>
                    {submission.description && (
                      <p className="text-gray-600 mb-4">{submission.description}</p>
                    )}
                    
                    <div className="flex items-center space-x-6 text-sm text-gray-500 mb-4">
                      <div className="flex items-center">
                        <FileText className="w-4 h-4 mr-1" />
                        <span>{submission.fileName}</span>
                      </div>
                      <div className="flex items-center">
                        <span>{formatFileSize(submission.fileSize)}</span>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        <span>Submitted {format(new Date(submission.submittedAt), 'MMM dd, yyyy')}</span>
                      </div>
                    </div>

                    {submission.event && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-600">
                          Event: <Link 
                            href={`/events/${submission.event.id}`}
                            className="text-primary hover:text-blue-700 font-medium"
                          >
                            {submission.event.title}
                          </Link>
                        </p>
                      </div>
                    )}

                    {submission.reviewComments && (
                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Review Comments</h4>
                        <p className="text-sm text-gray-700">{submission.reviewComments}</p>
                        {submission.reviewedAt && (
                          <p className="text-xs text-gray-500 mt-2">
                            Reviewed on {format(new Date(submission.reviewedAt), 'MMM dd, yyyy')}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col items-end space-y-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(submission.status)}`}>
                      {submission.status.replace('_', ' ').charAt(0).toUpperCase() + submission.status.replace('_', ' ').slice(1)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex space-x-3">
                    <a
                      href={submission.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View File
                    </a>
                  </div>
                  
                  <div className="flex space-x-2">
                    {submission.status === 'pending' && (
                      <button
                        onClick={() => handleDelete(submission.id)}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Submissions Yet</h3>
            <p className="text-gray-500 mb-6">
              You haven't uploaded any submissions. Start by uploading your first document.
            </p>
            <SubmissionUpload onSuccess={fetchSubmissions} />
          </div>
        )}
      </div>
    </PublicLayout>
  );
}