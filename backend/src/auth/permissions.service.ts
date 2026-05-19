import { Injectable } from '@nestjs/common';
import { UserRole, User } from '@prisma/client';

export enum Permission {
  // User management
  CREATE_USER = 'create:user',
  READ_USER = 'read:user',
  UPDATE_USER = 'update:user',
  DELETE_USER = 'delete:user',
  
  // Event management
  CREATE_EVENT = 'create:event',
  READ_EVENT = 'read:event',
  UPDATE_EVENT = 'update:event',
  DELETE_EVENT = 'delete:event',
  PUBLISH_EVENT = 'publish:event',
  
  // News management
  CREATE_NEWS = 'create:news',
  READ_NEWS = 'read:news',
  UPDATE_NEWS = 'update:news',
  DELETE_NEWS = 'delete:news',
  PUBLISH_NEWS = 'publish:news',
  
  // Comment management
  CREATE_COMMENT = 'create:comment',
  READ_COMMENT = 'read:comment',
  UPDATE_COMMENT = 'update:comment',
  DELETE_COMMENT = 'delete:comment',
  MODERATE_COMMENT = 'moderate:comment',
  
  // Submission management
  CREATE_SUBMISSION = 'create:submission',
  READ_SUBMISSION = 'read:submission',
  UPDATE_SUBMISSION = 'update:submission',
  DELETE_SUBMISSION = 'delete:submission',
  REVIEW_SUBMISSION = 'review:submission',
  
  // Registration management
  CREATE_REGISTRATION = 'create:registration',
  READ_REGISTRATION = 'read:registration',
  UPDATE_REGISTRATION = 'update:registration',
  DELETE_REGISTRATION = 'delete:registration',
  
  // System administration
  MANAGE_SYSTEM = 'manage:system',
  VIEW_ANALYTICS = 'view:analytics',
  MANAGE_SENSITIVE_WORDS = 'manage:sensitive_words',
  VIEW_AUDIT_LOGS = 'view:audit_logs',
}

@Injectable()
export class PermissionsService {
  private readonly rolePermissions: Record<UserRole, Permission[]> = {
    [UserRole.ADMIN]: [
      // Full access to everything
      ...Object.values(Permission),
    ],
    [UserRole.EDITOR]: [
      // Content management
      Permission.CREATE_EVENT,
      Permission.READ_EVENT,
      Permission.UPDATE_EVENT,
      Permission.DELETE_EVENT,
      Permission.PUBLISH_EVENT,
      Permission.CREATE_NEWS,
      Permission.READ_NEWS,
      Permission.UPDATE_NEWS,
      Permission.DELETE_NEWS,
      Permission.PUBLISH_NEWS,
      
      // Comment moderation
      Permission.READ_COMMENT,
      Permission.MODERATE_COMMENT,
      Permission.DELETE_COMMENT,
      
      // Submission review
      Permission.READ_SUBMISSION,
      Permission.REVIEW_SUBMISSION,
      
      // Registration management
      Permission.READ_REGISTRATION,
      Permission.UPDATE_REGISTRATION,
      
      // Limited user management
      Permission.READ_USER,
      
      // Analytics viewing
      Permission.VIEW_ANALYTICS,
    ],
    [UserRole.MEMBER]: [
      // Basic user actions
      Permission.READ_EVENT,
      Permission.READ_NEWS,
      Permission.CREATE_COMMENT,
      Permission.READ_COMMENT,
      Permission.UPDATE_COMMENT, // Own comments only
      Permission.DELETE_COMMENT, // Own comments only
      Permission.CREATE_SUBMISSION,
      Permission.READ_SUBMISSION, // Own submissions only
      Permission.UPDATE_SUBMISSION, // Own submissions only
      Permission.CREATE_REGISTRATION,
      Permission.READ_REGISTRATION, // Own registrations only
      Permission.UPDATE_REGISTRATION, // Own registrations only
      Permission.DELETE_REGISTRATION, // Own registrations only
      Permission.READ_USER, // Own profile only
      Permission.UPDATE_USER, // Own profile only
    ],
  };

  hasPermission(user: Omit<User, 'password'>, permission: Permission): boolean {
    const userPermissions = this.rolePermissions[user.role] || [];
    return userPermissions.includes(permission);
  }

  hasAnyPermission(user: Omit<User, 'password'>, permissions: Permission[]): boolean {
    return permissions.some(permission => this.hasPermission(user, permission));
  }

  hasAllPermissions(user: Omit<User, 'password'>, permissions: Permission[]): boolean {
    return permissions.every(permission => this.hasPermission(user, permission));
  }

  getUserPermissions(user: Omit<User, 'password'>): Permission[] {
    return this.rolePermissions[user.role] || [];
  }

  canAccessResource(
    user: Omit<User, 'password'>, 
    permission: Permission, 
    resourceOwnerId?: string
  ): boolean {
    // Admin can access everything
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    // Check if user has the permission
    if (!this.hasPermission(user, permission)) {
      return false;
    }

    // For member role, check resource ownership for certain permissions
    if (user.role === UserRole.MEMBER && resourceOwnerId) {
      const ownershipRequiredPermissions = [
        Permission.UPDATE_COMMENT,
        Permission.DELETE_COMMENT,
        Permission.READ_SUBMISSION,
        Permission.UPDATE_SUBMISSION,
        Permission.READ_REGISTRATION,
        Permission.UPDATE_REGISTRATION,
        Permission.DELETE_REGISTRATION,
        Permission.UPDATE_USER,
      ];

      if (ownershipRequiredPermissions.includes(permission)) {
        return user.id === resourceOwnerId;
      }
    }

    return true;
  }
}