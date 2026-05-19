'use client';

import { useState } from 'react';
import { CommentStatus, BulkModerationRequest } from '@/types/moderation';
import { Check, X, Flag, MessageSquare } from 'lucide-react';

interface BulkModerationActionsProps {
  selectedCount: number;
  selectedIds: string[];
  onBulkModeration: (request: BulkModerationRequest) => Promise<void>;
}

export function BulkModerationActions({ 
  selectedCount, 
  selectedIds, 
  onBulkModeration 
}: BulkModerationActionsProps) {
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState<CommentStatus | null>(null);
  const [moderationNote, setModerationNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleActionClick = (action: CommentStatus) => {
    setSelectedAction(action);
    setShowNoteModal(true);
  };

  const handleConfirmAction = async () => {
    if (!selectedAction) return;

    setLoading(true);
    try {
      await onBulkModeration({
        commentIds: selectedIds,
        action: selectedAction,
        moderationNote: moderationNote.trim() || undefined,
      });
      
      setShowNoteModal(false);
      setModerationNote('');
      setSelectedAction(null);
    } catch (error) {
      console.error('Error performing bulk moderation:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionLabel = (action: CommentStatus) => {
    switch (action) {
      case CommentStatus.APPROVED:
        return 'Approve';
      case CommentStatus.REJECTED:
        return 'Reject';
      case CommentStatus.FLAGGED:
        return 'Flag';
      default:
        return action;
    }
  };

  const getActionIcon = (action: CommentStatus) => {
    switch (action) {
      case CommentStatus.APPROVED:
        return <Check className="h-4 w-4" />;
      case CommentStatus.REJECTED:
        return <X className="h-4 w-4" />;
      case CommentStatus.FLAGGED:
        return <Flag className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  return (
    <>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <MessageSquare className="h-5 w-5 text-primary mr-2" />
            <span className="text-sm font-medium text-blue-900">
              {selectedCount} comment{selectedCount !== 1 ? 's' : ''} selected
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleActionClick(CommentStatus.APPROVED)}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              {getActionIcon(CommentStatus.APPROVED)}
              <span className="ml-1">Approve All</span>
            </button>
            
            <button
              onClick={() => handleActionClick(CommentStatus.REJECTED)}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              {getActionIcon(CommentStatus.REJECTED)}
              <span className="ml-1">Reject All</span>
            </button>
            
            <button
              onClick={() => handleActionClick(CommentStatus.FLAGGED)}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
            >
              {getActionIcon(CommentStatus.FLAGGED)}
              <span className="ml-1">Flag All</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showNoteModal && selectedAction && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center mb-4">
                {getActionIcon(selectedAction)}
                <h3 className="ml-2 text-lg font-medium text-gray-900">
                  {getActionLabel(selectedAction)} {selectedCount} Comment{selectedCount !== 1 ? 's' : ''}
                </h3>
              </div>
              
              <p className="text-sm text-gray-500 mb-4">
                Are you sure you want to {getActionLabel(selectedAction).toLowerCase()} {selectedCount} selected comment{selectedCount !== 1 ? 's' : ''}?
              </p>

              <div className="mb-4">
                <label htmlFor="moderationNote" className="block text-sm font-medium text-gray-700 mb-2">
                  Moderation Note (Optional)
                </label>
                <textarea
                  id="moderationNote"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Add a note about this moderation action..."
                  value={moderationNote}
                  onChange={(e) => setModerationNote(e.target.value)}
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowNoteModal(false);
                    setModerationNote('');
                    setSelectedAction(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmAction}
                  disabled={loading}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    selectedAction === CommentStatus.APPROVED
                      ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                      : selectedAction === CommentStatus.REJECTED
                      ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                      : 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500'
                  } disabled:opacity-50`}
                >
                  {loading ? 'Processing...' : `${getActionLabel(selectedAction)} All`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}