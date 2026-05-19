'use client'

import { useState, useEffect } from 'react';
import { MessageCircle, Reply, Edit, Trash2, Send, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Comment, CommentDto } from '@/types/public';
import { publicAPI } from '@/lib/public-api';
import { format } from 'date-fns';

interface CommentSectionProps {
  eventId?: string;
  newsId?: string;
}

interface CommentItemProps {
  comment: Comment;
  onReply: (parentId: string) => void;
  onEdit: (comment: Comment) => void;
  onDelete: (commentId: string) => void;
  currentUserId?: string;
}

function CommentItem({ comment, onReply, onEdit, onDelete, currentUserId }: CommentItemProps) {
  const isOwner = currentUserId === comment.userId;
  const isApproved = comment.status === 'approved';

  if (!isApproved && !isOwner) {
    return null; // Don't show unapproved comments to non-owners
  }

  return (
    <div className="border-l-2 border-gray-200 pl-4 py-3">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <span className="font-medium text-gray-900">
              {comment.user?.profile?.firstName && comment.user?.profile?.lastName
                ? `${comment.user.profile.firstName} ${comment.user.profile.lastName}`
                : comment.user?.username || 'Anonymous'
              }
            </span>
            <span className="text-sm text-gray-500">
              {format(new Date(comment.createdAt), 'MMM dd, yyyy HH:mm')}
            </span>
            {comment.status === 'pending' && (
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                Pending Approval
              </span>
            )}
          </div>
          <p className="text-gray-700 mb-3">{comment.content}</p>
          
          <div className="flex items-center space-x-4 text-sm">
            <button
              onClick={() => onReply(comment.id)}
              className="text-primary hover:text-blue-700 flex items-center"
            >
              <Reply className="w-4 h-4 mr-1" />
              Reply
            </button>
            
            {isOwner && (
              <>
                <button
                  onClick={() => onEdit(comment)}
                  className="text-gray-600 hover:text-gray-700 flex items-center"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </button>
                <button
                  onClick={() => onDelete(comment.id)}
                  className="text-red-600 hover:text-red-700 flex items-center"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-6 mt-4 space-y-3">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CommentSection({ eventId, newsId }: CommentSectionProps) {
  const { user, isAuthenticated } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    fetchComments();
  }, [eventId, newsId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const commentsData = await publicAPI.getComments(eventId, newsId);
      setComments(commentsData);
    } catch (err) {
      console.error('Error fetching comments:', err);
      setError('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      setError('Please log in to post comments');
      return;
    }

    if (!newComment.trim()) {
      setError('Comment cannot be empty');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const commentData: CommentDto = {
        content: newComment.trim(),
        eventId,
        newsId,
        parentId: replyingTo || undefined,
      };

      await publicAPI.createComment(commentData);
      setNewComment('');
      setReplyingTo(null);
      await fetchComments(); // Refresh comments
    } catch (err: any) {
      setError(err.message || 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingComment || !editContent.trim()) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await publicAPI.updateComment(editingComment.id, editContent.trim());
      setEditingComment(null);
      setEditContent('');
      await fetchComments(); // Refresh comments
    } catch (err: any) {
      setError(err.message || 'Failed to update comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    try {
      await publicAPI.deleteComment(commentId);
      await fetchComments(); // Refresh comments
    } catch (err: any) {
      setError(err.message || 'Failed to delete comment');
    }
  };

  const handleReply = (parentId: string) => {
    setReplyingTo(parentId);
    setEditingComment(null);
  };

  const handleEdit = (comment: Comment) => {
    setEditingComment(comment);
    setEditContent(comment.content);
    setReplyingTo(null);
  };

  const cancelEdit = () => {
    setEditingComment(null);
    setEditContent('');
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setNewComment('');
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center mb-6">
        <MessageCircle className="w-5 h-5 text-primary mr-2" />
        <h3 className="text-lg font-semibold text-gray-900">
          Comments ({comments.length})
        </h3>
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

      {/* Comment Form */}
      {isAuthenticated ? (
        <div className="mb-8">
          {editingComment ? (
            <form onSubmit={handleEditComment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Edit Comment
                </label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                  placeholder="Edit your comment..."
                  required
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {submitting ? 'Updating...' : 'Update Comment'}
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSubmitComment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {replyingTo ? 'Reply to Comment' : 'Add a Comment'}
                </label>
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                  placeholder={replyingTo ? 'Write your reply...' : 'Share your thoughts...'}
                  required
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {submitting ? 'Posting...' : (replyingTo ? 'Post Reply' : 'Post Comment')}
                </button>
                {replyingTo && (
                  <button
                    type="button"
                    onClick={cancelReply}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  >
                    Cancel Reply
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-6 mb-8 text-center">
          <p className="text-gray-600 mb-4">Please log in to join the discussion</p>
        </div>
      )}

      {/* Comments List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse border-l-2 border-gray-200 pl-4 py-3">
              <div className="h-4 bg-gray-200 rounded mb-2 w-1/4"></div>
              <div className="h-3 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      ) : comments.length > 0 ? (
        <div className="space-y-4">
          {comments?.filter(comment => !comment.parentId).map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                onReply={handleReply}
                onEdit={handleEdit}
                onDelete={handleDeleteComment}
                currentUserId={user?.id}
              />
            ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No comments yet</h3>
          <p className="text-gray-500">Be the first to share your thoughts!</p>
        </div>
      )}
    </div>
  );
}