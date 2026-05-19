import { SocialInteraction, User } from '@/types/networking';

export interface MentionNotification {
  id: string;
  mentionedUserId: string;
  mentionedByUserId: string;
  mentionedBy: User;
  contextType: 'discussion' | 'comment' | 'event' | 'news';
  contextId: string;
  contextTitle: string;
  mentionText: string;
  timestamp: Date;
  isRead: boolean;
  url: string;
}

export interface TagNotification {
  id: string;
  taggedUserId: string;
  taggedByUserId: string;
  taggedBy: User;
  tag: string;
  contextType: 'discussion' | 'comment' | 'event' | 'news';
  contextId: string;
  contextTitle: string;
  timestamp: Date;
  isRead: boolean;
  url: string;
}

class MentionService {
  private baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  private readonly placeholderAvatars = [
    '/images/features/innovation.jpg',
    '/images/features/research.jpg',
    '/images/features/collaboration.jpg',
  ];

  private avatar(i: number): string {
    return this.placeholderAvatars[i % this.placeholderAvatars.length];
  }

  // Mention Management
  async getMentions(userId: string, limit: number = 20, unreadOnly: boolean = false): Promise<MentionNotification[]> {
    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`${this.baseUrl}/api/users/${userId}/mentions?limit=${limit}&unreadOnly=${unreadOnly}`);
      // return await response.json();
      
      // Mock data for now
      return this.getMockMentions(userId, limit, unreadOnly);
    } catch (error) {
      console.error('Error fetching mentions:', error);
      return [];
    }
  }

  async markMentionAsRead(mentionId: string): Promise<void> {
    try {
      // TODO: Replace with actual API call
      // await fetch(`${this.baseUrl}/api/mentions/${mentionId}/read`, {
      //   method: 'PATCH'
      // });
      
      console.log(`Marking mention ${mentionId} as read`);
    } catch (error) {
      console.error('Error marking mention as read:', error);
      throw error;
    }
  }

  async markAllMentionsAsRead(userId: string): Promise<void> {
    try {
      // TODO: Replace with actual API call
      // await fetch(`${this.baseUrl}/api/users/${userId}/mentions/read-all`, {
      //   method: 'PATCH'
      // });
      
      console.log(`Marking all mentions as read for user ${userId}`);
    } catch (error) {
      console.error('Error marking all mentions as read:', error);
      throw error;
    }
  }

  // Tag Management
  async getTagNotifications(userId: string, limit: number = 20, unreadOnly: boolean = false): Promise<TagNotification[]> {
    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`${this.baseUrl}/api/users/${userId}/tags?limit=${limit}&unreadOnly=${unreadOnly}`);
      // return await response.json();
      
      // Mock data for now
      return this.getMockTagNotifications(userId, limit, unreadOnly);
    } catch (error) {
      console.error('Error fetching tag notifications:', error);
      return [];
    }
  }

  async markTagAsRead(tagId: string): Promise<void> {
    try {
      // TODO: Replace with actual API call
      // await fetch(`${this.baseUrl}/api/tags/${tagId}/read`, {
      //   method: 'PATCH'
      // });
      
      console.log(`Marking tag ${tagId} as read`);
    } catch (error) {
      console.error('Error marking tag as read:', error);
      throw error;
    }
  }

  // Utility Methods
  async getUnreadMentionCount(userId: string): Promise<number> {
    try {
      const mentions = await this.getMentions(userId, 100, true);
      return mentions.length;
    } catch (error) {
      console.error('Error getting unread mention count:', error);
      return 0;
    }
  }

  async getUnreadTagCount(userId: string): Promise<number> {
    try {
      const tags = await this.getTagNotifications(userId, 100, true);
      return tags.length;
    } catch (error) {
      console.error('Error getting unread tag count:', error);
      return 0;
    }
  }

  // Convert mentions to social interactions format
  async getMentionsAsSocialInteractions(userId: string, limit: number = 10): Promise<SocialInteraction[]> {
    try {
      const mentions = await this.getMentions(userId, limit);
      return mentions.map(mention => ({
        id: `mention-${mention.id}`,
        type: 'mention' as const,
        title: 'Mentioned in Discussion',
        description: `${mention.mentionedBy.firstName} ${mention.mentionedBy.lastName} mentioned you`,
        timestamp: mention.timestamp,
        targetType: mention.contextType as 'discussion' | 'event' | 'news',
        targetId: mention.contextId,
        targetTitle: mention.contextTitle,
        participants: [mention.mentionedBy],
        unreadCount: mention.isRead ? 0 : 1
      }));
    } catch (error) {
      console.error('Error converting mentions to social interactions:', error);
      return [];
    }
  }

  // Mock Data Methods (to be replaced with actual API calls)
  private getMockMentions(userId: string, limit: number, unreadOnly: boolean): MentionNotification[] {
    const allMentions = [
      {
        id: 'mention-1',
        mentionedUserId: userId,
        mentionedByUserId: 'user-2',
        mentionedBy: {
          id: 'user-2',
          username: 'sarah.chen',
          email: 'sarah.chen@example.com',
          firstName: 'Sarah',
          lastName: 'Chen',
          bio: 'IP Strategy Consultant',
          avatar: this.avatar(0),
          role: 'MEMBER',
          isActive: true,
          createdAt: new Date('2024-01-15T00:00:00Z')
        },
        contextType: 'discussion' as const,
        contextId: 'disc-1',
        contextTitle: 'Patent Filing Strategies for Startups',
        mentionText: 'What do you think about this approach, @username?',
        timestamp: new Date('2024-05-18T14:20:00Z'),
        isRead: false,
        url: '/discussions/disc-1'
      },
      {
        id: 'mention-2',
        mentionedUserId: userId,
        mentionedByUserId: 'user-3',
        mentionedBy: {
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
        },
        contextType: 'event' as const,
        contextId: 'event-1',
        contextTitle: 'IP Trends 2024 Conference',
        mentionText: 'Great point @username! I agree with your analysis.',
        timestamp: new Date('2024-05-18T11:30:00Z'),
        isRead: false,
        url: '/events/event-1'
      },
      {
        id: 'mention-3',
        mentionedUserId: userId,
        mentionedByUserId: 'user-4',
        mentionedBy: {
          id: 'user-4',
          username: 'alex.rivera',
          email: 'alex.rivera@example.com',
          firstName: 'Alex',
          lastName: 'Rivera',
          bio: 'Patent Examiner',
          avatar: this.avatar(2),
          role: 'MEMBER',
          isActive: true,
          createdAt: new Date('2024-03-01T00:00:00Z')
        },
        contextType: 'discussion' as const,
        contextId: 'disc-2',
        contextTitle: 'Innovation in Patent Law',
        mentionText: 'Thanks for the insight @username, very helpful!',
        timestamp: new Date('2024-05-17T16:45:00Z'),
        isRead: true,
        url: '/discussions/disc-2'
      }
    ];

    const filtered = unreadOnly ? allMentions.filter(m => !m.isRead) : allMentions;
    return filtered.slice(0, limit);
  }

  private getMockTagNotifications(userId: string, limit: number, unreadOnly: boolean): TagNotification[] {
    const allTags = [
      {
        id: 'tag-1',
        taggedUserId: userId,
        taggedByUserId: 'user-2',
        taggedBy: {
          id: 'user-2',
          username: 'sarah.chen',
          email: 'sarah.chen@example.com',
          firstName: 'Sarah',
          lastName: 'Chen',
          bio: 'IP Strategy Consultant',
          avatar: this.avatar(0),
          role: 'MEMBER',
          isActive: true,
          createdAt: new Date('2024-01-15T00:00:00Z')
        },
        tag: 'patent-expert',
        contextType: 'discussion' as const,
        contextId: 'disc-1',
        contextTitle: 'Patent Filing Strategies',
        timestamp: new Date('2024-05-18T13:15:00Z'),
        isRead: false,
        url: '/discussions/disc-1'
      },
      {
        id: 'tag-2',
        taggedUserId: userId,
        taggedByUserId: 'user-5',
        taggedBy: {
          id: 'user-5',
          username: 'lisa.wong',
          email: 'lisa.wong@example.com',
          firstName: 'Lisa',
          lastName: 'Wong',
          bio: 'Trademark Attorney',
          avatar: this.avatar(2),
          role: 'MEMBER',
          isActive: true,
          createdAt: new Date('2024-01-20T00:00:00Z')
        },
        tag: 'ip-law',
        contextType: 'event' as const,
        contextId: 'event-2',
        contextTitle: 'IP Conference 2024',
        timestamp: new Date('2024-05-17T10:20:00Z'),
        isRead: true,
        url: '/events/event-2'
      }
    ];

    const filtered = unreadOnly ? allTags.filter(t => !t.isRead) : allTags;
    return filtered.slice(0, limit);
  }
}

export const mentionService = new MentionService();
export default mentionService;