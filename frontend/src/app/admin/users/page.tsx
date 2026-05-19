'use client';

import { useState, useEffect } from 'react';
import { User } from '@/types/user';
import AdminGuard from '@/components/AdminGuard';
import EnhancedUserList from '@/components/admin/EnhancedUserList';
import BulkUserOperations from '@/components/admin/BulkUserOperations';
import UserProfileModal from '@/components/admin/UserProfileModal';

interface UserFilters {
  search: string;
  role: string;
  status: string;
  dateFrom: string;
  dateTo: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export default function UsersManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userModalMode, setUserModalMode] = useState<'view' | 'edit' | 'create'>('view');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || data);
      } else {
        throw new Error('Failed to load users');
      }
    } catch (error) {
      console.error('Error loading users:', error);
      setError('Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    setUserModalMode('view');
    setShowUserModal(true);
  };

  const handleBulkSelect = (userIds: string[]) => {
    setSelectedUserIds(userIds);
  };

  const handleCreateUser = () => {
    setSelectedUser(null);
    setUserModalMode('create');
    setShowUserModal(true);
  };

  const handleUserUpdate = (updatedUser: User) => {
    setUsers(prevUsers => {
      const existingIndex = prevUsers.findIndex(u => u.id === updatedUser.id);
      if (existingIndex >= 0) {
        // Update existing user
        const newUsers = [...prevUsers];
        newUsers[existingIndex] = updatedUser;
        return newUsers;
      } else {
        // Add new user
        return [updatedUser, ...prevUsers];
      }
    });
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setUserModalMode('edit');
    setShowUserModal(true);
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (response.ok) {
        // Remove user from list
        setUsers(prevUsers => prevUsers.filter(u => u.id !== userId));
        alert('User deleted successfully');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user. Please try again.');
    }
  };

  const handleExport = async (filters: UserFilters, selectedFields: string[]) => {
    try {
      // Filter users based on current filters
      let filteredUsers = users;
      
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredUsers = filteredUsers.filter(user =>
          user.username.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower) ||
          (user.firstName && user.firstName.toLowerCase().includes(searchLower)) ||
          (user.lastName && user.lastName.toLowerCase().includes(searchLower))
        );
      }

      if (filters.role !== 'ALL') {
        filteredUsers = filteredUsers.filter(user => user.role === filters.role);
      }

      if (filters.status !== 'ALL') {
        const isActive = filters.status === 'ACTIVE';
        filteredUsers = filteredUsers.filter(user => user.isActive === isActive);
      }

      if (filters.dateFrom) {
        const fromDate = new Date(filters.dateFrom);
        filteredUsers = filteredUsers.filter(user => new Date(user.createdAt) >= fromDate);
      }

      if (filters.dateTo) {
        const toDate = new Date(filters.dateTo);
        toDate.setHours(23, 59, 59, 999);
        filteredUsers = filteredUsers.filter(user => new Date(user.createdAt) <= toDate);
      }

      // Create CSV content
      const headers = selectedFields.map(field => {
        switch (field) {
          case 'username': return 'Username';
          case 'email': return 'Email';
          case 'firstName': return 'First Name';
          case 'lastName': return 'Last Name';
          case 'role': return 'Role';
          case 'isActive': return 'Status';
          case 'createdAt': return 'Join Date';
          case 'lastLoginAt': return 'Last Login';
          default: return field;
        }
      });

      const csvContent = [
        headers.join(','),
        ...filteredUsers.map(user => 
          selectedFields.map(field => {
            let value = user[field as keyof User];
            
            if (field === 'isActive') {
              value = value ? 'Active' : 'Inactive';
            } else if (field === 'createdAt' || field === 'lastLoginAt') {
              value = value ? new Date(value as string).toLocaleDateString() : 'N/A';
            } else if (value === null || value === undefined) {
              value = '';
            }
            
            // Escape commas and quotes in CSV
            const stringValue = String(value);
            if (stringValue.includes(',') || stringValue.includes('"')) {
              return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
          }).join(',')
        )
      ].join('\n');

      // Download CSV file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `users_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export users. Please try again.');
    }
  };

  const clearSelection = () => {
    setSelectedUserIds([]);
  };

  if (error) {
    return (
      <AdminGuard>
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-sm p-8 max-w-md w-full">
            <div className="text-center">
              <i className="fas fa-exclamation-triangle text-4xl text-red-500 mb-4"></i>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Users</h3>
              <p className="text-sm text-gray-600 mb-4">{error}</p>
              <button
                onClick={loadUsers}
                className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gray-100">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Manage user accounts, roles, and permissions
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={loadUsers}
                  disabled={loading}
                  className="text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50"
                  title="Refresh Users"
                >
                  <i className={`fas fa-sync-alt ${loading ? 'animate-spin' : ''}`}></i>
                </button>
                <button
                  onClick={handleCreateUser}
                  className="bg-accent text-white px-4 py-2 rounded-md hover:bg-accent/90 transition-colors flex items-center space-x-2"
                >
                  <i className="fas fa-plus"></i>
                  <span>Add User</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="space-y-6">
              {/* Bulk Operations */}
              {selectedUserIds.length > 0 && (
                <BulkUserOperations
                  selectedUserIds={selectedUserIds}
                  onOperationComplete={loadUsers}
                  onClearSelection={clearSelection}
                />
              )}

              {/* User List */}
              <EnhancedUserList
                users={users}
                loading={loading}
                onUserSelect={handleUserSelect}
                onBulkSelect={handleBulkSelect}
                selectedUsers={selectedUserIds}
                onRefresh={loadUsers}
                onExport={handleExport}
                onEdit={handleEditUser}
                onDelete={handleDeleteUser}
              />
            </div>
          </div>
        </div>

        {/* User Profile Modal */}
        <UserProfileModal
          user={selectedUser}
          isOpen={showUserModal}
          onClose={() => setShowUserModal(false)}
          onUserUpdate={handleUserUpdate}
          mode={userModalMode}
        />
      </div>
    </AdminGuard>
  );
}