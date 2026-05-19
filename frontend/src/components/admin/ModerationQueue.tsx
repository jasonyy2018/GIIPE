'use client';



import { useState, useEffect } from 'react';

import { 

  ModerationQueueItem, 

  ModerationQueueResponse, 

  ModerationFilters, 

  CommentStatus, 

  CommentTargetType,

  BulkModerationRequest 

} from '@/types/moderation';

import { 

  Eye, 

  Check, 

  X, 

  Flag, 

  Search, 

  Filter, 

  ChevronLeft, 

  ChevronRight,

  AlertTriangle,

  MessageSquare,

  Calendar,

  User

} from 'lucide-react';

import { CommentPreviewModal } from '@/components/admin/CommentPreviewModal';

import { BulkModerationActions } from '@/components/admin/BulkModerationActions';



interface ModerationQueueProps {

  onRefresh: () => void;

}



export default function ModerationQueue({ onRefresh }: ModerationQueueProps) {

  const [data, setData] = useState<ModerationQueueResponse | null>(null);

  const [loading, setLoading] = useState(true);

  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const [previewComment, setPreviewComment] = useState<ModerationQueueItem | null>(null);

  const [filters, setFilters] = useState<ModerationFilters>({

    page: 1,

    limit: 20,

    sortBy: 'createdAt',

    sortOrder: 'desc',

  });



  useEffect(() => {

    fetchModerationQueue();

  }, [filters]);



  const fetchModerationQueue = async () => {

    setLoading(true);

    try {

      const queryParams = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {

        if (value !== undefined && value !== '') {

          queryParams.append(key, value.toString());

        }

      });



      const response = await fetch(`/api/admin/moderation/queue?${queryParams}`);

      if (response.ok) {

        const result = await response.json();

        setData(result);

      } else {

        console.error('Failed to fetch moderation queue');

      }

    } catch (error) {

      console.error('Error fetching moderation queue:', error);

    } finally {

      setLoading(false);

    }

  };



  const handleFilterChange = (newFilters: Partial<ModerationFilters>) => {

    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));

    setSelectedItems(new Set());

  };



  const handlePageChange = (page: number) => {

    setFilters(prev => ({ ...prev, page }));

    setSelectedItems(new Set());

  };



  const handleSelectItem = (itemId: string) => {

    const newSelected = new Set(selectedItems);

    if (newSelected.has(itemId)) {

      newSelected.delete(itemId);

    } else {

      newSelected.add(itemId);

    }

    setSelectedItems(newSelected);

  };



  const handleSelectAll = () => {

    if (!data?.comments) {
      return;
    }

    if (selectedItems.size === data.comments.length) {

      setSelectedItems(new Set());

    } else {

      setSelectedItems(new Set(data.comments.map(item => item.id)));

    }

  };



  const handleBulkModeration = async (request: BulkModerationRequest) => {

    try {

      const response = await fetch('/api/admin/moderation/bulk', {

        method: 'POST',

        headers: {

          'Content-Type': 'application/json',

        },

        body: JSON.stringify(request),

      });



      if (response.ok) {

        const result = await response.json();

        console.log('Bulk moderation result:', result);

        

        // Refresh the queue

        await fetchModerationQueue();

        setSelectedItems(new Set());

        

        if (onRefresh) {

          onRefresh();

        }

      } else {

        console.error('Failed to perform bulk moderation');

      }

    } catch (error) {

      console.error('Error performing bulk moderation:', error);

    }

  };



  const handleSingleModeration = async (commentId: string, action: CommentStatus, note?: string) => {

    try {

      const response = await fetch(`/api/admin/moderation/comments/${commentId}`, {

        method: 'PUT',

        headers: {

          'Content-Type': 'application/json',

        },

        body: JSON.stringify({ action, moderationNote: note }),

      });



      if (response.ok) {

        await fetchModerationQueue();

        if (onRefresh) {

          onRefresh();

        }

      } else {

        console.error('Failed to moderate comment');

      }

    } catch (error) {

      console.error('Error moderating comment:', error);

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



  const getTargetTypeIcon = (targetType: CommentTargetType) => {

    switch (targetType) {

      case CommentTargetType.EVENT:

        return <Calendar className="h-4 w-4" />;

      case CommentTargetType.NEWS:

        return <MessageSquare className="h-4 w-4" />;

      case CommentTargetType.SUBMISSION:

        return <User className="h-4 w-4" />;

      default:

        return <MessageSquare className="h-4 w-4" />;

    }

  };



  if (loading) {

    return (

      <div className="p-6">

        <div className="animate-pulse space-y-4">

          {[...Array(5)].map((_, i) => (

            <div key={i} className="h-20 bg-gray-200 rounded"></div>

          ))}

        </div>

      </div>

    );

  }



  return (

    <div className="p-6">

      {/* Header and Filters */}

      <div className="mb-6 space-y-4">

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

          <h3 className="text-lg font-medium text-gray-900">Moderation Queue</h3>

          

          {/* Search */}

          <div className="relative">

            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />

            <input

              type="text"

              placeholder="Search comments..."

              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"

              value={filters.search || ''}

              onChange={(e) => handleFilterChange({ search: e.target.value })}

            />

          </div>

        </div>



        {/* Filters */}

        <div className="flex flex-wrap gap-4">

          <select

            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"

            value={filters.status || ''}

            onChange={(e) => handleFilterChange({ status: e.target.value as CommentStatus || undefined })}

          >

            <option value="">All Statuses</option>

            <option value={CommentStatus.PENDING}>Pending</option>

            <option value={CommentStatus.FLAGGED}>Flagged</option>

            <option value={CommentStatus.APPROVED}>Approved</option>

            <option value={CommentStatus.REJECTED}>Rejected</option>

          </select>



          <select

            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"

            value={filters.targetType || ''}

            onChange={(e) => handleFilterChange({ targetType: e.target.value as CommentTargetType || undefined })}

          >

            <option value="">All Types</option>

            <option value={CommentTargetType.EVENT}>Events</option>

            <option value={CommentTargetType.NEWS}>News</option>

            <option value={CommentTargetType.SUBMISSION}>Submissions</option>

          </select>



          <select

            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"

            value={filters.sortBy || 'createdAt'}

            onChange={(e) => handleFilterChange({ sortBy: e.target.value })}

          >

            <option value="createdAt">Date Created</option>

            <option value="reportCount">Report Count</option>

            <option value="status">Status</option>

          </select>

        </div>

      </div>



      {/* Bulk Actions */}

      {selectedItems.size > 0 && (

        <BulkModerationActions

          selectedCount={selectedItems.size}

          onBulkModeration={handleBulkModeration}

          selectedIds={Array.from(selectedItems)}

        />

      )}



      {/* Queue Table */}

      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">

        <table className="min-w-full divide-y divide-gray-300">

          <thead className="bg-gray-50">

            <tr>

              <th className="px-6 py-3 text-left">

                <input

                  type="checkbox"

                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"

                  checked={data?.comments && selectedItems.size === data.comments.length && data.comments.length > 0}

                  onChange={handleSelectAll}

                />

              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">

                Content

              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">

                Status

              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">

                Target

              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">

                Reports

              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">

                Actions

              </th>

            </tr>

          </thead>

          <tbody className="bg-white divide-y divide-gray-200">

            {data?.comments.map((comment) => (

              <tr key={comment.id} className="hover:bg-gray-50">

                <td className="px-6 py-4">

                  <input

                    type="checkbox"

                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"

                    checked={selectedItems.has(comment.id)}

                    onChange={() => handleSelectItem(comment.id)}

                  />

                </td>

                <td className="px-6 py-4">

                  <div className="max-w-xs">

                    <p className="text-sm text-gray-900 truncate">{comment.content}</p>

                    <p className="text-xs text-gray-500">

                      by {comment.user.username}  {new Date(comment.createdAt).toLocaleDateString()}

                    </p>

                    {comment.sensitiveFlags.length > 0 && (

                      <div className="flex flex-wrap gap-1 mt-1">

                        {comment.sensitiveFlags.map((flag, index) => (

                          <span

                            key={index}

                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800"

                          >

                            <AlertTriangle className="h-3 w-3 mr-1" />

                            {flag}

                          </span>

                        ))}

                      </div>

                    )}

                  </div>

                </td>

                <td className="px-6 py-4">

                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(comment.status)}`}>

                    {comment.status}

                  </span>

                </td>

                <td className="px-6 py-4">

                  <div className="flex items-center text-sm text-gray-900">

                    {getTargetTypeIcon(comment.targetType)}

                    <span className="ml-2">{comment.target?.title || 'Unknown'}</span>

                  </div>

                </td>

                <td className="px-6 py-4">

                  <span className="text-sm text-gray-900">{comment.reportCount}</span>

                </td>

                <td className="px-6 py-4">

                  <div className="flex items-center space-x-2">

                    <button

                      onClick={() => setPreviewComment(comment)}

                      className="text-primary hover:text-blue-900"

                      title="Preview"

                    >

                      <Eye className="h-4 w-4" />

                    </button>

                    <button

                      onClick={() => handleSingleModeration(comment.id, CommentStatus.APPROVED)}

                      className="text-green-600 hover:text-green-900"

                      title="Approve"

                    >

                      <Check className="h-4 w-4" />

                    </button>

                    <button

                      onClick={() => handleSingleModeration(comment.id, CommentStatus.REJECTED)}

                      className="text-red-600 hover:text-red-900"

                      title="Reject"

                    >

                      <X className="h-4 w-4" />

                    </button>

                    <button

                      onClick={() => handleSingleModeration(comment.id, CommentStatus.FLAGGED)}

                      className="text-yellow-600 hover:text-yellow-900"

                      title="Flag"

                    >

                      <Flag className="h-4 w-4" />

                    </button>

                  </div>

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>



      {/* Pagination */}

      {data && data.totalPages > 1 && (

        <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">

          <div className="flex justify-between flex-1 sm:hidden">

            <button

              onClick={() => handlePageChange(Math.max(1, data.page - 1))}

              disabled={data.page === 1}

              className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"

            >

              Previous

            </button>

            <button

              onClick={() => handlePageChange(Math.min(data.totalPages, data.page + 1))}

              disabled={data.page === data.totalPages}

              className="relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"

            >

              Next

            </button>

          </div>

          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">

            <div>

              <p className="text-sm text-gray-700">

                Showing <span className="font-medium">{(data.page - 1) * data.limit + 1}</span> to{' '}

                <span className="font-medium">

                  {Math.min(data.page * data.limit, data.total)}

                </span>{' '}

                of <span className="font-medium">{data.total}</span> results

              </p>

            </div>

            <div>

              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">

                <button

                  onClick={() => handlePageChange(Math.max(1, data.page - 1))}

                  disabled={data.page === 1}

                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"

                >

                  <ChevronLeft className="h-5 w-5" />

                </button>

                <button

                  onClick={() => handlePageChange(Math.min(data.totalPages, data.page + 1))}

                  disabled={data.page === data.totalPages}

                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"

                >

                  <ChevronRight className="h-5 w-5" />

                </button>

              </nav>

            </div>

          </div>

        </div>

      )}



      {/* Comment Preview Modal */}

      {previewComment && (

        <CommentPreviewModal

          comment={previewComment}

          onClose={() => setPreviewComment(null)}

          onModerate={handleSingleModeration}

        />

      )}

    </div>

  );

}