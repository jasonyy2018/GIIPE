'use client';

import { useState } from 'react';

interface EventWorkflowManagerProps {
  event: any;
  onWorkflowUpdate: (eventId: string, targetStatus: string, note?: string) => Promise<void>;
  isLoading?: boolean;
}

const statusConfig = {
  DRAFT: {
    label: 'Draft',
    color: 'bg-yellow-100 text-yellow-800',
    icon: 'fas fa-edit',
    nextStates: ['PUBLISHED', 'CANCELLED']
  },
  PUBLISHED: {
    label: 'Published',
    color: 'bg-green-100 text-green-800',
    icon: 'fas fa-check-circle',
    nextStates: ['DRAFT', 'CANCELLED', 'COMPLETED']
  },
  CANCELLED: {
    label: 'Cancelled',
    color: 'bg-red-100 text-red-800',
    icon: 'fas fa-times-circle',
    nextStates: ['DRAFT']
  },
  COMPLETED: {
    label: 'Completed',
    color: 'bg-light text-primary-dark',
    icon: 'fas fa-flag-checkered',
    nextStates: []
  }
};

export default function EventWorkflowManager({ event, onWorkflowUpdate, isLoading = false }: EventWorkflowManagerProps) {
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [workflowNote, setWorkflowNote] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const currentStatus = event.status;
  const currentConfig = statusConfig[currentStatus as keyof typeof statusConfig];
  const availableTransitions = currentConfig?.nextStates || [];

  const handleWorkflowUpdate = async () => {
    if (!selectedStatus) return;

    setIsUpdating(true);
    try {
      await onWorkflowUpdate(event.id, selectedStatus, workflowNote);
      setShowWorkflowModal(false);
      setSelectedStatus('');
      setWorkflowNote('');
    } catch (error) {
      console.error('Error updating workflow:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusIcon = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig];
    return config?.icon || 'fas fa-circle';
  };

  const getStatusColor = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig];
    return config?.color || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig];
    return config?.label || status;
  };

  const getTransitionDescription = (fromStatus: string, toStatus: string) => {
    const descriptions = {
      'DRAFT-PUBLISHED': 'Publish this event to make it visible to users',
      'DRAFT-CANCELLED': 'Cancel this event (can be reverted later)',
      'PUBLISHED-DRAFT': 'Unpublish this event (move back to draft)',
      'PUBLISHED-CANCELLED': 'Cancel this published event',
      'PUBLISHED-COMPLETED': 'Mark this event as completed',
      'CANCELLED-DRAFT': 'Restore this cancelled event to draft status'
    };
    return descriptions[`${fromStatus}-${toStatus}` as keyof typeof descriptions] || `Change status to ${getStatusLabel(toStatus)}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Event Workflow</h3>
        <div className="flex items-center space-x-2">
          <i className={`${currentConfig?.icon} text-gray-500`}></i>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${currentConfig?.color}`}>
            {currentConfig?.label}
          </span>
        </div>
      </div>

      {/* Current Status Info */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">Current Status</h4>
        <p className="text-gray-600 text-sm">
          This event is currently in <strong>{currentConfig?.label}</strong> status.
          {currentStatus === 'DRAFT' && ' The event is not visible to users and can be edited freely.'}
          {currentStatus === 'PUBLISHED' && ' The event is live and visible to users.'}
          {currentStatus === 'CANCELLED' && ' The event has been cancelled but can be restored.'}
          {currentStatus === 'COMPLETED' && ' The event has been completed and is archived.'}
        </p>
      </div>

      {/* Available Transitions */}
      {availableTransitions.length > 0 ? (
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Available Actions</h4>
          <div className="space-y-2">
            {availableTransitions.map((status) => (
              <button
                key={status}
                onClick={() => {
                  setSelectedStatus(status);
                  setShowWorkflowModal(true);
                }}
                disabled={isLoading}
                className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center space-x-3">
                  <i className={`${getStatusIcon(status)} text-gray-500`}></i>
                  <div className="text-left">
                    <div className="font-medium text-gray-900">
                      Change to {getStatusLabel(status)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {getTransitionDescription(currentStatus, status)}
                    </div>
                  </div>
                </div>
                <i className="fas fa-chevron-right text-gray-400"></i>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <i className="fas fa-lock text-gray-400 text-2xl mb-2"></i>
          <p className="text-gray-500">No workflow actions available for this status.</p>
        </div>
      )}

      {/* Workflow Modal */}
      {showWorkflowModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Confirm Status Change</h3>
              <button
                onClick={() => setShowWorkflowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-center space-x-4 py-4">
                <div className="text-center">
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${currentConfig?.color} mb-2`}>
                    <i className={`${currentConfig?.icon} mr-2`}></i>
                    {currentConfig?.label}
                  </div>
                </div>
                <i className="fas fa-arrow-right text-gray-400"></i>
                <div className="text-center">
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedStatus)} mb-2`}>
                    <i className={`${getStatusIcon(selectedStatus)} mr-2`}></i>
                    {getStatusLabel(selectedStatus)}
                  </div>
                </div>
              </div>
              <p className="text-gray-600 text-sm text-center">
                {getTransitionDescription(currentStatus, selectedStatus)}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Note (Optional)
              </label>
              <textarea
                value={workflowNote}
                onChange={(e) => setWorkflowNote(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Add a note about this status change..."
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowWorkflowModal(false)}
                disabled={isUpdating}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleWorkflowUpdate}
                disabled={isUpdating}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdating ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating...
                  </div>
                ) : (
                  'Confirm Change'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}