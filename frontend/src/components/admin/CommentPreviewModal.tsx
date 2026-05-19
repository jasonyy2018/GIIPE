'use client';

import { useState, useEffect } from 'react';
import { ModerationQueueItem, CommentStatus, CommentDetails } from '@/types/moderation';
import { 
  X, 
  Check, 
  Flag, 
  AlertTriangle, 
  User, 
  Calendar, 
  MessageSquare,
  ExternalLink,
  Shield
} from 'lucide-react';

interface CommentPreviewModalProps {
  comment: ModerationQueueItem;
  onClose: () => void;
  onModerate: (commentId: string, action: CommentStatus, note?: string) => Promise<void>;
}

export function CommentPreviewModal({ comment, onClose, onModerate }: CommentPreviewModalProps) {
  const [commentDetails, setCommentDetails] = useState<CommentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [moderationNote, setModerationNote] = useState('');
  const [moderating, setModerating] = useState(false);

  useEffect(() => {
    fetchCommentDetails();
  }, [comment.id]);

  const fetchCommentDetails = async () => {
    try {
      const response = await fetch(`/api/admin/moderation/comments/${comment.id}`);
      if (response.ok) {
        const details = await response.json();
        setCommentDetails(details);
      }
    } catch (error) {
      console.error('Error fetching comment details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleModerate = async (action: CommentStatus) => {
    setModerating(true);
    try {
      await onModerate(comment.id, action, moderationNote.trim() || undefined);
      onClose();
    } catch (error) {
      console.error('Error moderating comment:', error);
    } finally {
      setModerating(false);
    }
  };

  const getStatusBadge = (status: CommentStatus) => {
    const badges = {
      [CommentStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
      [CommentStatus.FLAGGED]: 'bg-red-100 text-red-800',
      [CommentStatus.APPROVED]: 'bg-green-100 text-green-800',
      [CommentStatus.REJECTED]: 'bg-gray-100 text-gray-800',
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const highlightSensitiveWords = (content: string, sensitiveFlags: string[]) => {
    if (sensitiveFlags.length === 0) return content;
    
    // This is a simple implementation - in a real app, you'd want to get the actual words from the backend
    let highlightedContent = content;
    sensitiveFlags.forEach(flag => {
      // Simple highlighting - you might want to implement more sophisticated word detection
      const regex = new RegExp(`\\b${flag}\\b`, 'gi');
      highlightedContent = highlightedContent.replace(
        regex, 
        `<mark class="bg-red-200 text-red-900 px-1 rounded">${flag}</mark>`
      );
    });
    
    return highlightedContent;
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-0 border w-full max-w-4xl shadow-lg rounded-lg bg-white mb-10">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Comment Details</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {loading ? (
          <div className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Comment Status and Info */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(comment.status)}`}>
                  {comment.status}
                </span>
                <div className="flex items-center text-sm text-gray-500">
                  <Calendar className="h-4 w-4 mr-1" />
                  {new Date(comment.createdAt).toLocaleString()}
                </div>
              </div>
              
              {comment.reportCount > 0 && (
                <div className="flex items-center text-sm text-red-600">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  {comment.reportCount} report{comment.reportCount !== 1 ? 's' : ''}
                </div>
              )}
            </div>

            {/* Comment Content */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Comment Content</h4>
              <div 
                className="text-gray-700 whitespace-pre-wrap"
                dangerouslySetInnerHTML={{
                  __html: highlightSensitiveWords(comment.content, comment.sensitiveFlags)
                }}
              />
              
              {comment.sensitiveFlags.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <h5 className="text-xs font-medium text-gray-500 mb-2">Detected Issues:</h5>
                  <div className="flex flex-wrap gap-2">
                    {comment.sensitiveFlags.map((flag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800"
                      >
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {flag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* User Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  Author Information
                </h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Username:</span> {comment.user.username}
                  </div>
                  {comment.user.firstName && (
                    <div>
                      <span className="font-medium">Name:</span> {comment.user.firstName} {comment.user.lastName}
                    </div>
                  )}
                  {commentDetails && 'email' in commentDetails.user && (
                    <div>
                      <span className="font-medium">Email:</span> {(commentDetails.user as any).email}
                    </div>
                  )}
                  {commentDetails && 'role' in commentDetails.user && (
                    <div>
                      <span className="font-medium">Role:</span> {(commentDetails.user as any).role}
                    </div>
                  )}
                  {commentDetails && 'createdAt' in commentDetails.user && (
                    <div>
                      <span className="font-medium">Member since:</span> {new Date((commentDetails.user as any).createdAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Target Information
                </h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Type:</span> {comment.targetType}
                  </div>
                  <div>
                    <span className="font-medium">Title:</span> {comment.target?.title || 'Unknown'}
                  </div>
                  {commentDetails?.target && 'description' in commentDetails.target && (
                    <div>
                      <span className="font-medium">Description:</span> 
                      <p className="mt-1 text-gray-600">{(commentDetails.target as any).description}</p>
                    </div>
                  )}
                  <button className="inline-flex items-center text-primary hover:text-primary-dark">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View Target
                  </button>
                </div>
              </div>
            </div>

            {/* Reports */}
            {comment.reports.length > 0 && (
              <div className="bg-red-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Reports ({comment.reports.length})
                </h4>
                <div className="space-y-3">
                  {comment.reports.map((report) => (
                    <div key={report.id} className="bg-white rounded p-3 border border-red-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-red-800">{report.reason}</span>
                        <span className="text-xs text-gray-500">
                          by {report.reportedBy.username} �?{new Date(report.reportedAt).toLocaleDateString()}
                        </span>
                      </div>
                      {report.description && (
                        <p className="text-sm text-gray-700">{report.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Previous Moderation */}
            {commentDetails?.moderatedAt && (
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                  <Shield className="h-4 w-4 mr-2" />
                  Previous Moderation
                </h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Moderated by:</span> {commentDetails.moderator?.username}
                  </div>
                  <div>
                    <span className="font-medium">Date:</span> {new Date(commentDetails.moderatedAt).toLocaleString()}
                  </div>
                  {commentDetails.moderationNote && (
                    <div>
                      <span className="font-medium">Note:</span> {commentDetails.moderationNote}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Moderation Note */}
            <div>
              <label htmlFor="moderationNote" className="block text-sm font-medium text-gray-700 mb-2">
                Moderation Note (Optional)
              </label>
              <textarea
                id="moderationNote"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="Add a note about this moderation decision..."
                value={moderationNote}
                onChange={(e) => setModerationNote(e.target.value)}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                disabled={moderating}
              >
                Cancel
              </button>
              
              <button
                onClick={() => handleModerate(CommentStatus.FLAGGED)}
                disabled={moderating}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-yellow-600 border border-transparent rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50"
              >
                <Flag className="h-4 w-4 mr-2" />
                Flag
              </button>
              
              <button
                onClick={() => handleModerate(CommentStatus.REJECTED)}
                disabled={moderating}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                <X className="h-4 w-4 mr-2" />
                Reject
              </button>
              
              <button
                onClick={() => handleModerate(CommentStatus.APPROVED)}
                disabled={moderating}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                <Check className="h-4 w-4 mr-2" />
                Approve
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}