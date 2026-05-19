'use client';

import { useState } from 'react';
import { UserRole } from '@/types/user';

interface BulkOperation {
  id: string;
  type: 'activate' | 'deactivate' | 'changeRole' | 'delete';
  userIds: string[];
  parameters?: {
    newRole?: UserRole;
  };
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  results?: BulkOperationResult[];
  error?: string;
}

interface BulkOperationResult {
  userId: string;
  success: boolean;
  error?: string;
}

interface BulkUserOperationsProps {
  selectedUserIds: string[];
  onOperationComplete?: () => void;
  onClearSelection?: () => void;
}

export default function BulkUserOperations({
  selectedUserIds,
  onOperationComplete,
  onClearSelection
}: BulkUserOperationsProps) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingOperation, setPendingOperation] = useState<Partial<BulkOperation> | null>(null);
  const [activeOperation, setActiveOperation] = useState<BulkOperation | null>(null);
  const [showProgressModal, setShowProgressModal] = useState(false);

  const operations = [
    {
      id: 'activate',
      label: 'Activate Users',
      icon: 'fas fa-check-circle',
      color: 'text-green-600',
      bgColor: 'bg-green-50 hover:bg-green-100',
      description: 'Activate selected users to allow them to access the platform'
    },
    {
      id: 'deactivate',
      label: 'Deactivate Users',
      icon: 'fas fa-ban',
      color: 'text-red-600',
      bgColor: 'bg-red-50 hover:bg-red-100',
      description: 'Deactivate selected users to prevent platform access'
    },
    {
      id: 'changeRole',
      label: 'Change Role',
      icon: 'fas fa-user-tag',
      color: 'text-primary',
      bgColor: 'bg-blue-50 hover:bg-light',
      description: 'Change the role of selected users'
    },
    {
      id: 'delete',
      label: 'Delete Users',
      icon: 'fas fa-trash',
      color: 'text-red-600',
      bgColor: 'bg-red-50 hover:bg-red-100',
      description: 'Permanently delete selected users (cannot be undone)'
    }
  ];

  const handleOperationClick = (operationType: string) => {
    const operation = {
      id: Date.now().toString(),
      type: operationType as BulkOperation['type'],
      userIds: selectedUserIds,
      status: 'pending' as const,
      progress: 0
    };

    setPendingOperation(operation);
    setShowConfirmModal(true);
  };

  const confirmOperation = async () => {
    if (!pendingOperation) return;

    setShowConfirmModal(false);
    setActiveOperation(pendingOperation as BulkOperation);
    setShowProgressModal(true);

    try {
      await executeBulkOperation(pendingOperation as BulkOperation);
    } catch (error) {
      console.error('Bulk operation failed:', error);
    }
  };

  const executeBulkOperation = async (operation: BulkOperation) => {
    setActiveOperation(prev => prev ? { ...prev, status: 'processing' } : null);

    const results: BulkOperationResult[] = [];
    const totalUsers = operation.userIds.length;

    for (let i = 0; i < operation.userIds.length; i++) {
      const userId = operation.userIds[i];
      
      try {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Make actual API call based on operation type
        let response;
        switch (operation.type) {
          case 'activate':
            response = await fetch(`/api/admin/users/${userId}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
              },
              body: JSON.stringify({ isActive: true })
            });
            break;
          
          case 'deactivate':
            response = await fetch(`/api/admin/users/${userId}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
              },
              body: JSON.stringify({ isActive: false })
            });
            break;
          
          case 'changeRole':
            if (!operation.parameters?.newRole) {
              throw new Error('New role not specified');
            }
            response = await fetch(`/api/admin/users/${userId}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
              },
              body: JSON.stringify({ role: operation.parameters.newRole })
            });
            break;
          
          case 'delete':
            response = await fetch(`/api/admin/users/${userId}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
              }
            });
            break;
          
          default:
            throw new Error(`Unknown operation type: ${operation.type}`);
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        results.push({ userId, success: true });
      } catch (error) {
        results.push({ 
          userId, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      // Update progress
      const progress = Math.round(((i + 1) / totalUsers) * 100);
      setActiveOperation(prev => prev ? { ...prev, progress, results: [...results] } : null);
    }

    // Mark operation as completed
    setActiveOperation(prev => prev ? { 
      ...prev, 
      status: 'completed',
      progress: 100,
      results
    } : null);

    // Auto-close progress modal after 2 seconds if all operations succeeded
    const allSucceeded = results.every(r => r.success);
    if (allSucceeded) {
      setTimeout(() => {
        setShowProgressModal(false);
        setActiveOperation(null);
        onOperationComplete?.();
        onClearSelection?.();
      }, 2000);
    }
  };

  const closeProgressModal = () => {
    setShowProgressModal(false);
    setActiveOperation(null);
    onOperationComplete?.();
    if (activeOperation?.status === 'completed') {
      onClearSelection?.();
    }
  };

  const getOperationTitle = (type: string) => {
    switch (type) {
      case 'activate': return 'Activate Users';
      case 'deactivate': return 'Deactivate Users';
      case 'changeRole': return 'Change User Roles';
      case 'delete': return 'Delete Users';
      default: return 'Bulk Operation';
    }
  };

  const getOperationDescription = (operation: Partial<BulkOperation>) => {
    const count = operation.userIds?.length || 0;
    switch (operation.type) {
      case 'activate':
        return `Are you sure you want to activate ${count} user${count !== 1 ? 's' : ''}? They will be able to access the platform.`;
      case 'deactivate':
        return `Are you sure you want to deactivate ${count} user${count !== 1 ? 's' : ''}? They will not be able to access the platform.`;
      case 'changeRole':
        return `Are you sure you want to change the role of ${count} user${count !== 1 ? 's' : ''} to ${operation.parameters?.newRole}?`;
      case 'delete':
        return `Are you sure you want to permanently delete ${count} user${count !== 1 ? 's' : ''}? This action cannot be undone.`;
      default:
        return `Are you sure you want to perform this operation on ${count} user${count !== 1 ? 's' : ''}?`;
    }
  };

  if (selectedUserIds.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <i className="fas fa-users text-3xl text-gray-300 mb-3"></i>
        <p className="text-gray-500 font-medium">No users selected</p>
        <p className="text-sm text-gray-400 mt-1">
          Select users from the list to perform bulk operations
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Bulk Operations
            </h3>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-600">
                {selectedUserIds.length} user{selectedUserIds.length !== 1 ? 's' : ''} selected
              </span>
              <button
                onClick={onClearSelection}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear selection
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {operations.map((operation) => (
              <button
                key={operation.id}
                onClick={() => handleOperationClick(operation.id)}
                className={`p-4 rounded-lg border-2 border-dashed border-gray-200 transition-all ${operation.bgColor} group`}
              >
                <div className="text-center">
                  <i className={`${operation.icon} text-2xl ${operation.color} mb-2 group-hover:scale-110 transition-transform`}></i>
                  <h4 className="font-medium text-gray-900 mb-1">
                    {operation.label}
                  </h4>
                  <p className="text-xs text-gray-600">
                    {operation.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && pendingOperation && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {getOperationTitle(pendingOperation.type!)}
                </h3>
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>

              {pendingOperation.type === 'changeRole' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select new role:
                  </label>
                  <select
                    value={pendingOperation.parameters?.newRole || ''}
                    onChange={(e) => setPendingOperation(prev => prev ? {
                      ...prev,
                      parameters: { ...prev.parameters, newRole: e.target.value as UserRole }
                    } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  >
                    <option value="">Select role...</option>
                    <option value="ADMIN">Admin</option>
                    <option value="EDITOR">Editor</option>
                    <option value="MEMBER">Member</option>
                  </select>
                </div>
              )}

              <p className="text-sm text-gray-600 mb-6">
                {getOperationDescription(pendingOperation)}
              </p>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmOperation}
                  disabled={pendingOperation.type === 'changeRole' && !pendingOperation.parameters?.newRole}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed ${
                    pendingOperation.type === 'delete' 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-primary hover:bg-primary-dark'
                  }`}
                >
                  {pendingOperation.type === 'delete' ? 'Delete' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Progress Modal */}
      {showProgressModal && activeOperation && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {getOperationTitle(activeOperation.type)}
                </h3>
                {activeOperation.status === 'completed' && (
                  <button
                    onClick={closeProgressModal}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                )}
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Progress</span>
                  <span>{activeOperation.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      activeOperation.status === 'completed' 
                        ? 'bg-green-600' 
                        : 'bg-primary'
                    }`}
                    style={{ width: `${activeOperation.progress}%` }}
                  ></div>
                </div>
              </div>

              {/* Status */}
              <div className="mb-4">
                <div className="flex items-center space-x-2">
                  {activeOperation.status === 'processing' && (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      <span className="text-sm text-gray-600">Processing...</span>
                    </>
                  )}
                  {activeOperation.status === 'completed' && (
                    <>
                      <i className="fas fa-check-circle text-green-600"></i>
                      <span className="text-sm text-gray-600">Completed</span>
                    </>
                  )}
                  {activeOperation.status === 'failed' && (
                    <>
                      <i className="fas fa-exclamation-circle text-red-600"></i>
                      <span className="text-sm text-gray-600">Failed</span>
                    </>
                  )}
                </div>
              </div>

              {/* Results */}
              {activeOperation.results && activeOperation.results.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Results:</h4>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {activeOperation.results.map((result, index) => (
                      <div key={index} className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">User {result.userId.slice(-8)}</span>
                        {result.success ? (
                          <span className="text-green-600 flex items-center">
                            <i className="fas fa-check mr-1"></i>
                            Success
                          </span>
                        ) : (
                          <span className="text-red-600 flex items-center" title={result.error}>
                            <i className="fas fa-times mr-1"></i>
                            Failed
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeOperation.status === 'completed' && (
                <div className="flex justify-end">
                  <button
                    onClick={closeProgressModal}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}