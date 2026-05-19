import { 
  Connection, 
  ConnectionRequest, 
  NetworkActivity, 
  NetworkStats, 
  ConnectionRecommendation,
  SocialInteraction,
  DiscussionParticipation,
  User 
} from '@/types/networking';

class NetworkingService {
  private baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  private readonly placeholderAvatars = [
    '/images/features/innovation.jpg',
    '/images/features/research.jpg',
    '/images/features/collaboration.jpg',
  ];

  private avatar(i: number): string {
    return this.placeholderAvatars[i % this.placeholderAvatars.length];
  }

  // Connection Management
  async getConnections(userId: string): Promise<Connection[]> {
    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`${this.baseUrl}/api/users/${userId}/connections`);
      // return await response.json();
      
      // Mock data for now
      return this.getMockConnections(userId);
    } catch (error) {
      console.error('Error fetching connections:', error);
      return [];
    }
  }

  async getConnectionRequests(userId: string): Promise<ConnectionRequest[]> {
    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`${this.baseUrl}/api/users/${userId}/connection-requests`);
      // return await response.json();
      
      // Mock data for now
      return this.getMockConnectionRequests(userId);
    } catch (error) {
      console.error('Error fetching connection requests:', error);
      return [];
    }
  }

  async sendConnectionRequest(fromUserId: string, toUserId: string, message?: string): Promise<ConnectionRequest> {
    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`${this.baseUrl}/api/connections/request`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ fromUserId, toUserId, message })
      // });
      // return await response.json();
      
      // Mock response for now
      return {
        id: `req-${Date.now()}`,
        fromUserId,
        toUserId,
        message,
        status: 'pending',
        createdAt: new Date()
      };
    } catch (error) {
      console.error('Error sending connection request:', error);
      throw error;
    }
  }

  async respondToConnectionRequest(requestId: string, action: 'accept' | 'decline'): Promise<Connection | null> {
    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`${this.baseUrl}/api/connections/request/${requestId}`, {
      //   method: 'PATCH',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ action })
      // });
      // return await response.json();
      
      // Mock response for now
      if (action === 'accept') {
        return {
          id: `conn-${Date.now()}`,
          userId: 'current-user',
          connectedUserId: 'other-user',
          status: 'accepted',
          initiatedBy: 'other-user',
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }
      return null;
    } catch (error) {
      console.error('Error responding to connection request:', error);
      throw error;
    }
  }

  // Network Activity
  async getNetworkActivity(userId: string, limit: number = 10): Promise<NetworkActivity[]> {
    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`${this.baseUrl}/api/users/${userId}/network-activity?limit=${limit}`);
      // return await response.json();
      
      // Mock data for now
      return this.getMockNetworkActivity(userId, limit);
    } catch (error) {
      console.error('Error fetching network activity:', error);
      return [];
    }
  }

  // Network Statistics
  async getNetworkStats(userId: string): Promise<NetworkStats> {
    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`${this.baseUrl}/api/users/${userId}/network-stats`);
      // return await response.json();
      
      // Mock data for now
      return this.getMockNetworkStats(userId);
    } catch (error) {
      console.error('Error fetching network stats:', error);
      return {
        totalConnections: 0,
        pendingRequests: 0,
        sentRequests: 0,
        profileViews: 0,
        mutualConnections: 0,
        monthlyGrowth: {
          connections: 0,
          profileViews: 0,
          interactions: 0
        }
      };
    }
  }

  // Connection Recommendations
  async getConnectionRecommendations(userId: string, limit: number = 5): Promise<ConnectionRecommendation[]> {
    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`${this.baseUrl}/api/users/${userId}/connection-recommendations?limit=${limit}`);
      // return await response.json();
      
      // Mock data for now - using enhanced algorithm
      return this.generateConnectionRecommendations(userId, limit);
    } catch (error) {
      console.error('Error fetching connection recommendations:', error);
      return [];
    }
  }

  // Enhanced recommendation methods
  async getRecommendationsByMutualConnections(userId: string, limit: number = 10): Promise<ConnectionRecommendation[]> {
    try {
      // TODO: Replace with actual API call
      return this.generateMutualConnectionRecommendations(userId, limit);
    } catch (error) {
      console.error('Error fetching mutual connection recommendations:', error);
      return [];
    }
  }

  async getRecommendationsByInterests(userId: string, limit: number = 10): Promise<ConnectionRecommendation[]> {
    try {
      // TODO: Replace with actual API call
      return this.generateInterestBasedRecommendations(userId, limit);
    } catch (error) {
      console.error('Error fetching interest-based recommendations:', error);
      return [];
    }
  }

  async getRecommendationsByEvents(userId: string, limit: number = 10): Promise<ConnectionRecommendation[]> {
    try {
      // TODO: Replace with actual API call
      return this.generateEventBasedRecommendations(userId, limit);
    } catch (error) {
      console.error('Error fetching event-based recommendations:', error);
      return [];
    }
  }

  async dismissRecommendation(userId: string, recommendationId: string): Promise<void> {
    try {
      // TODO: Replace with actual API call
      // await fetch(`${this.baseUrl}/api/users/${userId}/recommendations/${recommendationId}/dismiss`, {
      //   method: 'POST'
      // });
      console.log(`Dismissed recommendation ${recommendationId} for user ${userId}`);
    } catch (error) {
      console.error('Error dismissing recommendation:', error);
      throw error;
    }
  }

  // Social Interactions
  async getSocialInteractions(userId: string, limit: number = 10): Promise<SocialInteraction[]> {
    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`${this.baseUrl}/api/users/${userId}/social-interactions?limit=${limit}`);
      // return await response.json();
      
      // Mock data for now
      return this.getMockSocialInteractions(userId, limit);
    } catch (error) {
      console.error('Error fetching social interactions:', error);
      return [];
    }
  }

  // Discussion Participation
  async getDiscussionParticipation(userId: string, limit: number = 10): Promise<DiscussionParticipation[]> {
    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`${this.baseUrl}/api/users/${userId}/discussion-participation?limit=${limit}`);
      // return await response.json();
      
      // Mock data for now
      return this.getMockDiscussionParticipation(userId, limit);
    } catch (error) {
      console.error('Error fetching discussion participation:', error);
      return [];
    }
  }

  // Mock Data Methods (to be replaced with actual API calls)
  private getMockConnections(userId: string): Connection[] {
    return [
      {
        id: 'conn-1',
        userId,
        connectedUserId: 'user-2',
        status: 'accepted',
        initiatedBy: userId,
        createdAt: new Date('2024-05-15T10:30:00Z'),
        updatedAt: new Date('2024-05-15T10:30:00Z'),
        connectedUser: {
          id: 'user-2',
          username: 'sarah.chen',
          email: 'sarah.chen@example.com',
          firstName: 'Sarah',
          lastName: 'Chen',
          bio: 'IP Strategy Consultant & Patent Attorney',
          avatar: this.avatar(0),
          role: 'MEMBER',
          isActive: true,
          createdAt: new Date('2024-01-15T00:00:00Z')
        }
      },
      {
        id: 'conn-2',
        userId,
        connectedUserId: 'user-3',
        status: 'accepted',
        initiatedBy: 'user-3',
        createdAt: new Date('2024-05-10T14:20:00Z'),
        updatedAt: new Date('2024-05-10T14:20:00Z'),
        connectedUser: {
          id: 'user-3',
          username: 'mike.johnson',
          email: 'mike.johnson@example.com',
          firstName: 'Mike',
          lastName: 'Johnson',
          bio: 'Technology Transfer Specialist',
          avatar: this.avatar(1),
          role: 'MEMBER',
          isActive: true,
          createdAt: new Date('2024-02-01T00:00:00Z')
        }
      }
    ];
  }

  private getMockConnectionRequests(userId: string): ConnectionRequest[] {
    return [
      {
        id: 'req-1',
        fromUserId: 'user-4',
        toUserId: userId,
        message: 'Hi! I saw your presentation at the IP conference. Would love to connect!',
        status: 'pending',
        createdAt: new Date('2024-05-18T09:15:00Z'),
        fromUser: {
          id: 'user-4',
          username: 'alex.rivera',
          email: 'alex.rivera@example.com',
          firstName: 'Alex',
          lastName: 'Rivera',
          bio: 'Patent Examiner & IP Researcher',
          avatar: this.avatar(2),
          role: 'MEMBER',
          isActive: true,
          createdAt: new Date('2024-03-01T00:00:00Z')
        }
      }
    ];
  }

  private getMockNetworkActivity(userId: string, limit: number): NetworkActivity[] {
    const activities = [
      {
        id: 'activity-1',
        type: 'connection_accepted' as const,
        title: 'Connection Accepted',
        description: 'Sarah Chen accepted your connection request',
        timestamp: new Date('2024-05-18T10:30:00Z'),
        relatedUserId: 'user-2',
        relatedUser: {
          id: 'user-2',
          username: 'sarah.chen',
          email: 'sarah.chen@example.com',
          firstName: 'Sarah',
          lastName: 'Chen',
          avatar: this.avatar(0),
          role: 'MEMBER',
          isActive: true,
          createdAt: new Date('2024-01-15T00:00:00Z')
        }
      },
      {
        id: 'activity-2',
        type: 'connection_request_received' as const,
        title: 'New Connection Request',
        description: 'Alex Rivera wants to connect with you',
        timestamp: new Date('2024-05-18T09:15:00Z'),
        relatedUserId: 'user-4',
        relatedUser: {
          id: 'user-4',
          username: 'alex.rivera',
          email: 'alex.rivera@example.com',
          firstName: 'Alex',
          lastName: 'Rivera',
          avatar: this.avatar(2),
          role: 'MEMBER',
          isActive: true,
          createdAt: new Date('2024-03-01T00:00:00Z')
        }
      },
      {
        id: 'activity-3',
        type: 'profile_viewed' as const,
        title: 'Profile Viewed',
        description: 'Mike Johnson viewed your profile',
        timestamp: new Date('2024-05-17T16:45:00Z'),
        relatedUserId: 'user-3',
        relatedUser: {
          id: 'user-3',
          username: 'mike.johnson',
          email: 'mike.johnson@example.com',
          firstName: 'Mike',
          lastName: 'Johnson',
          avatar: this.avatar(1),
          role: 'MEMBER',
          isActive: true,
          createdAt: new Date('2024-02-01T00:00:00Z')
        }
      }
    ];

    return activities.slice(0, limit);
  }

  private getMockNetworkStats(userId: string): NetworkStats {
    return {
      totalConnections: 156,
      pendingRequests: 3,
      sentRequests: 1,
      profileViews: 47,
      mutualConnections: 23,
      monthlyGrowth: {
        connections: 8,
        profileViews: 15,
        interactions: 12
      }
    };
  }

  // Enhanced recommendation generation with scoring algorithm
  private generateConnectionRecommendations(userId: string, limit: number): ConnectionRecommendation[] {
    // Combine different recommendation strategies
    const mutualRecommendations = this.generateMutualConnectionRecommendations(userId, Math.ceil(limit * 0.4));
    const interestRecommendations = this.generateInterestBasedRecommendations(userId, Math.ceil(limit * 0.3));
    const eventRecommendations = this.generateEventBasedRecommendations(userId, Math.ceil(limit * 0.3));

    // Combine and deduplicate
    const allRecommendations = [...mutualRecommendations, ...interestRecommendations, ...eventRecommendations];
    const uniqueRecommendations = this.deduplicateRecommendations(allRecommendations);

    // Sort by score and return top recommendations
    return uniqueRecommendations?.sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private generateMutualConnectionRecommendations(userId: string, limit: number): ConnectionRecommendation[] {
    // Mock users with mutual connections
    const mockUsers = [
      {
        id: 'user-5',
        username: 'lisa.wong',
        email: 'lisa.wong@example.com',
        firstName: 'Lisa',
        lastName: 'Wong',
        bio: 'Trademark Attorney & Brand Protection Expert',
        avatar: this.avatar(0),
        role: 'MEMBER',
        isActive: true,
        createdAt: new Date('2024-01-20T00:00:00Z')
      },
      {
        id: 'user-7',
        username: 'emma.taylor',
        email: 'emma.taylor@example.com',
        firstName: 'Emma',
        lastName: 'Taylor',
        bio: 'IP Licensing Specialist & Contract Negotiator',
        avatar: this.avatar(1),
        role: 'MEMBER',
        isActive: true,
        createdAt: new Date('2024-01-25T00:00:00Z')
      }
    ];

    return mockUsers.slice(0, limit).map((user, index) => {
      const mutualConnections = 8 - index * 2;
      const sharedInterests = ['IP Law', 'Patent Strategy', 'Legal Technology'];
      const sharedEvents = 3 - index;

      return {
        id: `mutual-rec-${user.id}`,
        recommendedUser: user,
        score: this.calculateConnectionScore({
          mutualConnections,
          sharedInterests: sharedInterests.length,
          sharedEvents,
          profileCompleteness: 0.9,
          activityLevel: 0.8,
          responseRate: 0.85
        }),
        reasons: ['Strong mutual connections', 'Similar professional network', 'Active in same circles'],
        mutualConnections,
        sharedInterests,
        sharedEvents
      };
    });
  }

  private generateInterestBasedRecommendations(userId: string, limit: number): ConnectionRecommendation[] {
    // Mock users with shared interests
    const mockUsers = [
      {
        id: 'user-6',
        username: 'david.kim',
        email: 'david.kim@example.com',
        firstName: 'David',
        lastName: 'Kim',
        bio: 'Innovation Manager & IP Portfolio Strategist',
        avatar: this.avatar(2),
        role: 'MEMBER',
        isActive: true,
        createdAt: new Date('2024-02-10T00:00:00Z')
      },
      {
        id: 'user-8',
        username: 'rachel.green',
        email: 'rachel.green@example.com',
        firstName: 'Rachel',
        lastName: 'Green',
        bio: 'Technology Transfer Officer & Research Commercialization Expert',
        avatar: this.avatar(0),
        role: 'MEMBER',
        isActive: true,
        createdAt: new Date('2024-02-15T00:00:00Z')
      }
    ];

    return mockUsers.slice(0, limit).map((user, index) => {
      const mutualConnections = 4 - index;
      const sharedInterests = ['Innovation Management', 'Technology Transfer', 'R&D Strategy', 'IP Commercialization'];
      const sharedEvents = 2 - index;

      return {
        id: `interest-rec-${user.id}`,
        recommendedUser: user,
        score: this.calculateConnectionScore({
          mutualConnections,
          sharedInterests: sharedInterests.length,
          sharedEvents,
          profileCompleteness: 0.85,
          activityLevel: 0.9,
          responseRate: 0.8
        }),
        reasons: ['Shared professional interests', 'Similar expertise areas', 'Complementary skills'],
        mutualConnections,
        sharedInterests,
        sharedEvents
      };
    });
  }

  private generateEventBasedRecommendations(userId: string, limit: number): ConnectionRecommendation[] {
    // Mock users from shared events
    const mockUsers = [
      {
        id: 'user-9',
        username: 'james.wilson',
        email: 'james.wilson@example.com',
        firstName: 'James',
        lastName: 'Wilson',
        bio: 'Patent Prosecutor & IP Strategy Consultant',
        avatar: this.avatar(1),
        role: 'MEMBER',
        isActive: true,
        createdAt: new Date('2024-03-01T00:00:00Z')
      },
      {
        id: 'user-10',
        username: 'sophia.martinez',
        email: 'sophia.martinez@example.com',
        firstName: 'Sophia',
        lastName: 'Martinez',
        bio: 'IP Analytics Specialist & Data Science Expert',
        avatar: this.avatar(2),
        role: 'MEMBER',
        isActive: true,
        createdAt: new Date('2024-03-05T00:00:00Z')
      }
    ];

    return mockUsers.slice(0, limit).map((user, index) => {
      const mutualConnections = 2 - index;
      const sharedInterests = ['Patent Analytics', 'IP Data Science', 'Legal Technology'];
      const sharedEvents = 4 - index;

      return {
        id: `event-rec-${user.id}`,
        recommendedUser: user,
        score: this.calculateConnectionScore({
          mutualConnections,
          sharedInterests: sharedInterests.length,
          sharedEvents,
          profileCompleteness: 0.8,
          activityLevel: 0.85,
          responseRate: 0.9
        }),
        reasons: ['Attended same events', 'Active event participant', 'Similar event interests'],
        mutualConnections,
        sharedInterests,
        sharedEvents
      };
    });
  }

  private calculateConnectionScore(factors: {
    mutualConnections: number;
    sharedInterests: number;
    sharedEvents: number;
    profileCompleteness: number;
    activityLevel: number;
    responseRate: number;
  }): number {
    // Weighted scoring algorithm
    const weights = {
      mutualConnections: 0.25,
      sharedInterests: 0.20,
      sharedEvents: 0.15,
      profileCompleteness: 0.15,
      activityLevel: 0.15,
      responseRate: 0.10
    };

    // Normalize factors to 0-1 scale
    const normalizedFactors = {
      mutualConnections: Math.min(factors.mutualConnections / 10, 1), // Max 10 mutual connections = 1.0
      sharedInterests: Math.min(factors.sharedInterests / 5, 1), // Max 5 shared interests = 1.0
      sharedEvents: Math.min(factors.sharedEvents / 5, 1), // Max 5 shared events = 1.0
      profileCompleteness: factors.profileCompleteness,
      activityLevel: factors.activityLevel,
      responseRate: factors.responseRate
    };

    // Calculate weighted score
    let score = 0;
    Object.entries(normalizedFactors).forEach(([factor, value]) => {
      score += value * weights[factor as keyof typeof weights];
    });

    // Add bonus for high-quality combinations
    if (normalizedFactors.mutualConnections > 0.5 && normalizedFactors.sharedInterests > 0.6) {
      score += 0.1; // Bonus for strong mutual connections + shared interests
    }

    if (normalizedFactors.sharedEvents > 0.6 && normalizedFactors.activityLevel > 0.8) {
      score += 0.05; // Bonus for event attendance + high activity
    }

    return Math.min(Math.max(score, 0), 1); // Ensure score is between 0 and 1
  }

  private deduplicateRecommendations(recommendations: ConnectionRecommendation[]): ConnectionRecommendation[] {
    const seen = new Set<string>();
    const unique: ConnectionRecommendation[] = [];

    recommendations.forEach(rec => {
      if (!seen.has(rec.recommendedUser.id)) {
        seen.add(rec.recommendedUser.id);
        unique.push(rec);
      } else {
        // If we've seen this user before, merge the reasons and take the higher score
        const existingIndex = unique.findIndex(u => u.recommendedUser.id === rec.recommendedUser.id);
        if (existingIndex !== -1) {
          const existing = unique[existingIndex];
          if (rec.score > existing.score) {
            // Merge reasons and take the better recommendation
            unique[existingIndex] = {
              ...rec,
              reasons: Array.from(new Set([...existing.reasons, ...rec.reasons])),
              mutualConnections: Math.max(existing.mutualConnections, rec.mutualConnections),
              sharedEvents: Math.max(existing.sharedEvents, rec.sharedEvents),
              sharedInterests: Array.from(new Set([...existing.sharedInterests, ...rec.sharedInterests]))
            };
          }
        }
      }
    });

    return unique;
  }

  private getMockConnectionRecommendations(userId: string, limit: number): ConnectionRecommendation[] {
    // Legacy method - kept for backward compatibility
    return this.generateConnectionRecommendations(userId, limit);
  }

  private getMockSocialInteractions(userId: string, limit: number): SocialInteraction[] {
    const interactions = [
      {
        id: 'social-1',
        type: 'mention' as const,
        title: 'Mentioned in Discussion',
        description: 'Sarah Chen mentioned you in "Patent Filing Strategies"',
        timestamp: new Date('2024-05-18T14:20:00Z'),
        targetType: 'discussion' as const,
        targetId: 'disc-1',
        targetTitle: 'Patent Filing Strategies',
        participants: [
          {
            id: 'user-2',
            username: 'sarah.chen',
            email: 'sarah.chen@example.com',
            firstName: 'Sarah',
            lastName: 'Chen',
            avatar: this.avatar(0),
            role: 'MEMBER',
            isActive: true,
            createdAt: new Date('2024-01-15T00:00:00Z')
          }
        ],
        unreadCount: 1
      },
      {
        id: 'social-2',
        type: 'comment' as const,
        title: 'New Comment Reply',
        description: 'Mike Johnson replied to your comment on "IP Trends 2024"',
        timestamp: new Date('2024-05-18T11:30:00Z'),
        targetType: 'event' as const,
        targetId: 'event-1',
        targetTitle: 'IP Trends 2024 Conference',
        participants: [
          {
            id: 'user-3',
            username: 'mike.johnson',
            email: 'mike.johnson@example.com',
            firstName: 'Mike',
            lastName: 'Johnson',
            avatar: this.avatar(1),
            role: 'MEMBER',
            isActive: true,
            createdAt: new Date('2024-02-01T00:00:00Z')
          }
        ],
        unreadCount: 2
      },
      {
        id: 'social-3',
        type: 'discussion_reply' as const,
        title: 'Discussion Reply',
        description: 'Alex Rivera replied to the discussion you\'re following',
        timestamp: new Date('2024-05-17T16:45:00Z'),
        targetType: 'discussion' as const,
        targetId: 'disc-2',
        targetTitle: 'Innovation in Patent Law',
        participants: [
          {
            id: 'user-4',
            username: 'alex.rivera',
            email: 'alex.rivera@example.com',
            firstName: 'Alex',
            lastName: 'Rivera',
            avatar: this.avatar(2),
            role: 'MEMBER',
            isActive: true,
            createdAt: new Date('2024-03-01T00:00:00Z')
          }
        ],
        unreadCount: 0
      },
      {
        id: 'social-4',
        type: 'event_discussion' as const,
        title: 'Event Discussion Activity',
        description: 'New activity in IP Conference 2024 discussion',
        timestamp: new Date('2024-05-17T14:30:00Z'),
        targetType: 'event' as const,
        targetId: 'event-2',
        targetTitle: 'IP Conference 2024',
        participants: [
          {
            id: 'user-5',
            username: 'lisa.wong',
            email: 'lisa.wong@example.com',
            firstName: 'Lisa',
            lastName: 'Wong',
            avatar: this.avatar(0),
            role: 'MEMBER',
            isActive: true,
            createdAt: new Date('2024-01-20T00:00:00Z')
          },
          {
            id: 'user-6',
            username: 'david.kim',
            email: 'david.kim@example.com',
            firstName: 'David',
            lastName: 'Kim',
            avatar: this.avatar(2),
            role: 'MEMBER',
            isActive: true,
            createdAt: new Date('2024-02-10T00:00:00Z')
          }
        ],
        unreadCount: 3
      }
    ];

    return interactions.slice(0, limit);
  }

  private getMockDiscussionParticipation(userId: string, limit: number): DiscussionParticipation[] {
    const discussions = [
      {
        id: 'part-1',
        discussionId: 'disc-1',
        discussionTitle: 'Patent Filing Strategies for Startups',
        discussionType: 'general' as const,
        lastActivity: new Date('2024-05-18T14:20:00Z'),
        participantCount: 8,
        userCommentCount: 3,
        unreadReplies: 2,
        isActive: true
      },
      {
        id: 'part-2',
        discussionId: 'disc-2',
        discussionTitle: 'IP Trends 2024 Conference Discussion',
        discussionType: 'event' as const,
        lastActivity: new Date('2024-05-18T11:30:00Z'),
        participantCount: 15,
        userCommentCount: 5,
        unreadReplies: 1,
        isActive: true
      },
      {
        id: 'part-3',
        discussionId: 'disc-3',
        discussionTitle: 'New EU Patent Regulations',
        discussionType: 'news' as const,
        lastActivity: new Date('2024-05-17T09:45:00Z'),
        participantCount: 12,
        userCommentCount: 2,
        unreadReplies: 0,
        isActive: false
      }
    ];

    return discussions.slice(0, limit);
  }
}

export const networkingService = new NetworkingService();
export default networkingService;