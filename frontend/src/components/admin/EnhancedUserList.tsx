'use client';

import { useState, useEffect, useMemo } from 'react';
import { User, UserRole } from '@/types/user';

interface UserFilters {
  search: string;
  role: UserRole | 'ALL';
  status: 'ALL' | 'ACTIVE' | 'INACTIVE';
  dateFrom: string;
  dateTo: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface EnhancedUserListProps {
  users: User[];
  loading?: boolean;
  onUserSelect?: (user: User) => void;
  onBulkSelect?: (userIds: string[]) => void;
  selectedUsers?: string[];
  onRefresh?: () => void;
  onExport?: (filters: UserFilters, selectedFields: string[]) => void;
  onDelete?: (userId: string) => void;
  onEdit?: (user: User) => void;
}

const EXPORT_FIELDS = [
  { key: 'username', label: 'Username' },
  { key: 'email', label: 'Email' },
  { key: 'firstName', label: 'First Name' },
  { key: 'lastName', label: 'Last Name' },
  { key: 'role', label: 'Role' },
  { key: 'isActive', label: 'Status' },
  { key: 'createdAt', label: 'Join Date' },
  { key: 'lastLoginAt', label: 'Last Login' },
];

export default function EnhancedUserList({
  users,
  loading = false,
  onUserSelect,
  onBulkSelect,
  selectedUsers = [],
  onRefresh,
  onExport,
  onDelete,
  onEdit
}: EnhancedUserListProps) {
  const [filters, setFilters] = useState<UserFilters>({
    search: '',
    role: 'ALL',
    status: 'ALL',
    dateFrom: '',
    dateTo: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedExportFields, setSelectedExportFields] = useState<string[]>(
    EXPORT_FIELDS.map(field => field.key)
  );

  // Filter and sort users
  const filteredUsers = useMemo(() => {
    let filtered = users.filter(user => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          user.username.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower) ||
          (user.firstName && user.firstName.toLowerCase().includes(searchLower)) ||
          (user.lastName && user.lastName.toLowerCase().includes(searchLower));
        
        if (!matchesSearch) return false;
      }

      // Role filter
      if (filters.role !== 'ALL' && user.role !== filters.role) {
        return false;
      }

      // Status filter
      if (filters.status !== 'ALL') {
        const isActive = filters.status === 'ACTIVE';
        if (user.isActive !== isActive) return false;
      }

      // Date range filter
      if (filters.dateFrom) {
        const userDate = new Date(user.createdAt);
        const fromDate = new Date(filters.dateFrom);
        if (userDate < fromDate) return false;
      }

      if (filters.dateTo) {
        const userDate = new Date(user.createdAt);
        const toDate = new Date(filters.dateTo);
        toDate.setHours(23, 59, 59, 999); // End of day
        if (userDate > toDate) return false;
      }

      return true;
    });

    // Sort users
    filtered.sort((a, b) => {
      let aValue: any = a[filters.sortBy as keyof User];
      let bValue: any = b[filters.sortBy as keyof User];

      // Handle date sorting
      if (filters.sortBy === 'createdAt' || filters.sortBy === 'lastLoginAt') {
        aValue = new Date(aValue as string).getTime();
        bValue = new Date(bValue as string).getTime();
      }

      // Handle string sorting
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return filters.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return filters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [users, filters]);

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const handleFilterChange = (key: keyof UserFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSort = (column: string) => {
    if (filters.sortBy === column) {
      setFilters(prev => ({
        ...prev,
        sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc'
      }));
    } else {
      setFilters(prev => ({
        ...prev,
        sortBy: column,
        sortOrder: 'asc'
      }));
    }
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === paginatedUsers.length) {
      onBulkSelect?.([]);
    } else {
      onBulkSelect?.(paginatedUsers.map(user => user.id));
    }
  };

  const handleUserSelect = (userId: string) => {
    const newSelection = selectedUsers.includes(userId)
      ? selectedUsers.filter(id => id !== userId)
      : [...selectedUsers, userId];
    onBulkSelect?.(newSelection);
  };

  const handleExport = () => {
    if (onExport) {
      onExport(filters, selectedExportFields);
      setShowExportModal(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      role: 'ALL',
      status: 'ALL',
      dateFrom: '',
      dateTo: '',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'ADMIN': return 'bg-red-100 text-red-800';
      case 'EDITOR': return 'bg-light text-primary-dark';
      case 'MEMBER': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2 text-gray-600">Loading users...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">User Management</h3>
          <div className="flex items-center space-x-3">
            {selectedUsers.length > 0 && (
              <span className="text-sm text-gray-600">
                {selectedUsers.length} selected
              </span>
            )}
            <button
              onClick={() => setShowExportModal(true)}
              className="text-gray-600 hover:text-gray-900 transition-colors"
              title="Export Users"
            >
              <i className="fas fa-download"></i>
            </button>
            <button
              onClick={onRefresh}
              className="text-gray-600 hover:text-gray-900 transition-colors"
              title="Refresh"
            >
              <i className="fas fa-sync-alt"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {/* Search */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search users..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              />
              <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
            </div>
          </div>

          {/* Role Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              value={filters.role}
              onChange={(e) => handleFilterChange('role', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            >
              <option value="ALL">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="EDITOR">Editor</option>
              <option value="MEMBER">Member</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            />
          </div>
        </div>

        {/* Filter Actions */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              Showing {paginatedUsers.length} of {filteredUsers.length} users
            </span>
            {(filters.search || filters.role !== 'ALL' || filters.status !== 'ALL' || filters.dateFrom || filters.dateTo) && (
              <button
                onClick={clearFilters}
                className="text-sm text-primary hover:text-primary-dark font-medium"
              >
                Clear Filters
              </button>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">Show:</label>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedUsers.length === paginatedUsers.length && paginatedUsers.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('username')}
              >
                <div className="flex items-center space-x-1">
                  <span>User</span>
                  {filters.sortBy === 'username' && (
                    <i className={`fas fa-chevron-${filters.sortOrder === 'asc' ? 'up' : 'down'} text-primary`}></i>
                  )}
                </div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('role')}
              >
                <div className="flex items-center space-x-1">
                  <span>Role</span>
                  {filters.sortBy === 'role' && (
                    <i className={`fas fa-chevron-${filters.sortOrder === 'asc' ? 'up' : 'down'} text-primary`}></i>
                  )}
                </div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('isActive')}
              >
                <div className="flex items-center space-x-1">
                  <span>Status</span>
                  {filters.sortBy === 'isActive' && (
                    <i className={`fas fa-chevron-${filters.sortOrder === 'asc' ? 'up' : 'down'} text-primary`}></i>
                  )}
                </div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('createdAt')}
              >
                <div className="flex items-center space-x-1">
                  <span>Joined</span>
                  {filters.sortBy === 'createdAt' && (
                    <i className={`fas fa-chevron-${filters.sortOrder === 'asc' ? 'up' : 'down'} text-primary`}></i>
                  )}
                </div>
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedUsers.length > 0 ? (
              paginatedUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => handleUserSelect(user.id)}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
                          <span className="text-white font-medium text-sm">
                            {user.firstName?.[0] || user.username[0].toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => onUserSelect?.(user)}
                        className="text-primary hover:text-primary-dark transition-colors"
                        title="View Details"
                      >
                        <i className="fas fa-eye"></i>
                      </button>
                      {onEdit && (
                        <button
                          onClick={() => onEdit(user)}
                          className="text-accent hover:text-accent/80 transition-colors"
                          title="Edit User"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete user "${user.username}"? This action cannot be undone.`)) {
                              onDelete(user.id);
                            }
                          }}
                          className="text-red-600 hover:text-red-800 transition-colors"
                          title="Delete User"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  <div className="flex flex-col items-center">
                    <i className="fas fa-users text-4xl text-gray-300 mb-4"></i>
                    <p className="text-lg font-medium text-gray-400">No users found</p>
                    <p className="text-sm text-gray-400 mt-1">
                      {filters.search || filters.role !== 'ALL' || filters.status !== 'ALL' || filters.dateFrom || filters.dateTo
                        ? 'Try adjusting your filters'
                        : 'No users have been created yet'
                      }
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length} results
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              
              {/* Page numbers */}
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1 border rounded text-sm ${
                        currentPage === pageNum
                          ? 'bg-primary text-white border-primary'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Export Users</h3>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-3">
                  Select fields to include in export:
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {EXPORT_FIELDS.map((field) => (
                    <label key={field.key} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedExportFields.includes(field.key)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedExportFields(prev => [...prev, field.key]);
                          } else {
                            setSelectedExportFields(prev => prev.filter(f => f !== field.key));
                          }
                        }}
                        className="rounded border-gray-300 text-primary focus:ring-primary mr-2"
                      />
                      <span className="text-sm text-gray-700">{field.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExport}
                  disabled={selectedExportFields.length === 0}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Export CSV
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}