export interface Connection {
  id: string;
  userId: string;
  connectedUserId: string;
  status: 'pending' | 'accepted' | 'declined' | 'blocked';
  initiatedBy: string;
  createdAt: Date;
  updatedAt: Date;
  user?: User;
  connectedUser?: User;
}

export interface ConnectionRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  message?: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Date;
  fromUser?: User;
  toUser?: User;
}

export interface NetworkActivity {
  id: string;
  type: 'connection_request_sent' | 'connection_request_received' | 'connection_accepted' | 'connection_declined' | 'profile_viewed' | 'message_sent' | 'discussion_joined';
  title: string;
  description: string;
  timestamp: Date;
  relatedUserId?: string;
  relatedUser?: User;
  metadata?: Record<string, any>;
}

export interface NetworkStats {
  totalConnections: number;
  pendingRequests: number;
  sentRequests: number;
  profileViews: number;
  mutualConnections: number;
  monthlyGrowth: {
    connections: number;
    profileViews: number;
    interactions: number;
  };
}

export interface User {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  avatar?: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
}

export interface ConnectionRecommendation {
  id: string;
  recommendedUser: User;
  score: number;
  reasons: string[];
  mutualConnections: number;
  sharedInterests: string[];
  sharedEvents: number;
}

export interface SocialInteraction {
  id: string;
  type: 'comment' | 'mention' | 'discussion_reply' | 'event_discussion';
  title: string;
  description: string;
  timestamp: Date;
  targetType: 'event' | 'news' | 'discussion' | 'comment';
  targetId: string;
  targetTitle?: string;
  participants?: User[];
  unreadCount?: number;
}

export interface DiscussionParticipation {
  id: string;
  discussionId: string;
  discussionTitle: string;
  discussionType: 'event' | 'news' | 'general';
  lastActivity: Date;
  participantCount: number;
  userCommentCount: number;
  unreadReplies: number;
  isActive: boolean;
}