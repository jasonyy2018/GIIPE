'use client';

import { useState, useEffect, useCallback } from 'react';
import { NotificationArchive } from '@/types/notification';
import { notificationService } from '@/services/notificationService';

interface ArchivedNotificationsProps {
  userId: string;
  limit?: number;
  onNotificationRestore?: (archiveId: string) => void;
}

export default function ArchivedNotifications({
  userId,
  limit = 50,
  onNotificationRestore
}: ArchivedNotificationsProps) {
  const [archivedNotifications, setArchivedNotifications] = useState<NotificationArchive[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArchives, setSelectedArchives] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Load archived notifications
  const loadArchivedNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const result = await notificationService.getArchivedNotifications(userId, limit);
      setArchivedNotifications(result.notifications || []);
    } catch (error) {
      console.error('Error loading archived notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, limit]);

  // Load archived notifications on mount
  useEffect(() => {
    loadArchivedNotifications();
  }, [loadArchivedNotifications]);

  // Handle archive selection
  const handleArchiveSelect = (archiveId: string, selected: boolean) => {
    const newSelection = new Set(selectedArchives);
    if (selected) {
      newSelection.add(archiveId);
    } else {
      newSelection.delete(archiveId);
    }
    setSelectedArchives(newSelection);
  };

  // Handle select all
  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedArchives(new Set(archivedNotifications.map(a => a.id)));
    } else {
      setSelectedArchives(new Set());
    }
  };

  // Handle bulk restore
  const handleBulkRestore = async () => {
    setBulkActionLoading(true);
    try {
      await notificationService.restoreNotifications(userId, Array.from(selectedArchives));
      
      // Update local state
      setArchivedNotifications(prev =>
        prev.filter(archive => !selectedArchives.has(archive.id))
      );
      
      setSelectedArchives(new Set());
    } catch (error) {
      console.error('Error restoring notifications:', error);
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Handle individual restore
  const handleRestore = async (archiveId: string) => {
    try {
      await notificationService.restoreNotifications(userId, [archiveId]);
      
      // Update local state
      setArchivedNotifications(prev =>
        prev.filter(archive => archive.id !== archiveId)
      );

      if (onNotificationRestore) {
        onNotificationRestore(archiveId);
      }
    } catch (error) {
      console.error('Error restoring notification:', error);
    }
  };

  // Get utility functions
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'system': return 'fas fa-cog';
      case 'event': return 'fas fa-calendar-alt';
      case 'social': return 'fas fa-users';
      case 'security': return 'fas fa-shield-alt';
      default: return 'fas fa-bell';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'system': return 'text-primary';
      case 'event': return 'text-green-600';
      case 'social': return 'text-purple-600';
      case 'security': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getReasonBadge = (reason: string) => {
    switch (reason) {
      case 'auto':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-light text-primary-dark">Auto</span>;
      case 'manual':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Manual</span>;
      case 'bulk':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">Bulk</span>;
      default:
        return null;
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString();
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString();
    }
  };

  const allSelected = archivedNotifications.length > 0 && selectedArchives.size === archivedNotifications.length;
  const someSelected = selectedArchives.size > 0 && selectedArchives.size < archivedNotifications.length;

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Archived Notifications</h3>
          <button
            onClick={loadArchivedNotifications}
            disabled={loading}
            className="text-primary hover:text-primary-dark font-medium text-sm"
          >
            <i className={`fas fa-sync-alt mr-1 ${loading ? 'animate-spin' : ''}`}></i>
            Refresh
          </button>
        </div>

        {/* Bulk Actions */}
        {selectedArchives.size > 0 && (
          <div className="flex items-center justify-between bg-blue-50 rounded-lg p-3">
            <span className="text-sm text-primary-dark">
              {selectedArchives.size} archived notification{selectedArchives.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleBulkRestore}
                disabled={bulkActionLoading}
                className="text-sm text-green-600 hover:text-green-800 font-medium"
              >
                <i className="fas fa-undo mr-1"></i>
                Restore Selected
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Archived Notifications List */}
      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-500">Loading archived notifications...</p>
          </div>
        ) : archivedNotifications.length > 0 ? (
          <>
            {/* Select All Header */}
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = someSelected;
                  }}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <span className="text-sm font-medium text-gray-700">
                  Select all ({archivedNotifications.length})
                </span>
              </label>
            </div>

            {/* Archived Notifications */}
            <div className="divide-y divide-gray-100">
              {archivedNotifications.map((archive) => (
                <div
                  key={archive.id}
                  className="p-4 hover:bg-gray-50 bg-gray-25"
                >
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedArchives.has(archive.id)}
                      onChange={(e) => handleArchiveSelect(archive.id, e.target.checked)}
                      className="mt-1 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <div className={`mt-1 ${getTypeColor(archive.notification.type)}`}>
                      <i className={`${getTypeIcon(archive.notification.type)} text-lg opacity-60`}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-gray-600 truncate">
                          {archive.notification.title}
                        </h4>
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          {getReasonBadge(archive.reason)}
                          <span className="text-xs text-gray-400">
                            Archived {formatDate(new Date(archive.archivedAt))}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 line-clamp-2 mb-2">
                        {archive.notification.message}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">
                          Original: {formatDate(new Date(archive.notification.timestamp))}
                        </span>
                        <button
                          onClick={() => handleRestore(archive.id)}
                          className="text-xs text-green-600 hover:text-green-800 font-medium"
                        >
                          <i className="fas fa-undo mr-1"></i>
                          Restore
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <i className="fas fa-archive text-2xl text-gray-400"></i>
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Archived Notifications</h4>
            <p className="text-gray-500">
              Notifications that you archive will appear here. You can restore them at any time.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}