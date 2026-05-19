import { Notification as NotificationType } from '@/types/notification';

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushNotificationConfig {
  vapidPublicKey: string;
  serviceWorkerPath: string;
  iconUrl: string;
  badgeUrl: string;
}

class PushNotificationService {
  private config: PushNotificationConfig;
  private registration: ServiceWorkerRegistration | null = null;
  private subscription: globalThis.PushSubscription | null = null;

  constructor(config: Partial<PushNotificationConfig> = {}) {
    this.config = {
      vapidPublicKey: config.vapidPublicKey || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
      serviceWorkerPath: config.serviceWorkerPath || '/sw.js',
      iconUrl: config.iconUrl || '/icon-192x192.png',
      badgeUrl: config.badgeUrl || '/badge-72x72.png'
    };
  }

  // Initialize push notifications
  async initialize(): Promise<boolean> {
    try {
      // Check if service workers are supported
      if (!('serviceWorker' in navigator)) {
        console.warn('Service workers not supported');
        return false;
      }

      // Check if push messaging is supported
      if (!('PushManager' in window)) {
        console.warn('Push messaging not supported');
        return false;
      }

      // Register service worker
      this.registration = await navigator.serviceWorker.register(this.config.serviceWorkerPath);
      console.log('Service worker registered:', this.registration);

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;

      return true;
    } catch (error) {
      console.error('Error initializing push notifications:', error);
      return false;
    }
  }

  // Request notification permission
  async requestPermission(): Promise<NotificationPermission> {
    try {
      const permission = await Notification.requestPermission();
      console.log('Notification permission:', permission);
      return permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  }

  // Subscribe to push notifications
  async subscribe(userId: string): Promise<PushSubscription | null> {
    try {
      if (!this.registration) {
        throw new Error('Service worker not registered');
      }

      // Check if already subscribed
      const existingSubscription = await this.registration.pushManager.getSubscription();
      if (existingSubscription) {
        this.subscription = existingSubscription;
        await this.sendSubscriptionToServer(userId, existingSubscription);
        return this.convertSubscription(existingSubscription);
      }

      // Create new subscription
      const applicationServerKey = this.urlBase64ToUint8Array(this.config.vapidPublicKey);
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as BufferSource
      });

      this.subscription = subscription;
      await this.sendSubscriptionToServer(userId, subscription);
      
      return this.convertSubscription(subscription);
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      return null;
    }
  }

  // Unsubscribe from push notifications
  async unsubscribe(userId: string): Promise<boolean> {
    try {
      if (!this.subscription) {
        return true;
      }

      const success = await this.subscription.unsubscribe();
      
      if (success) {
        await this.removeSubscriptionFromServer(userId);
        this.subscription = null;
      }

      return success;
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      return false;
    }
  }

  // Check if subscribed
  async isSubscribed(): Promise<boolean> {
    try {
      if (!this.registration) {
        return false;
      }

      const subscription = await this.registration.pushManager.getSubscription();
      this.subscription = subscription;
      return !!subscription;
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return false;
    }
  }

  // Show local notification (fallback)
  async showLocalNotification(notification: NotificationType): Promise<void> {
    try {
      // Check permission
      if (Notification.permission !== 'granted') {
        console.warn('Notification permission not granted');
        return;
      }

      // Create notification options
      const options: NotificationOptions = {
        body: notification.message,
        icon: this.config.iconUrl,
        badge: this.config.badgeUrl,
        tag: notification.id,
        data: {
          id: notification.id,
          actionUrl: notification.actionUrl,
          timestamp: notification.timestamp
        },
        requireInteraction: notification.priority === 'high',
        silent: notification.priority === 'low'
      };

      // Add actions if available
      if (notification.actionText && notification.actionUrl) {
        (options as any).actions = [
          {
            action: 'view',
            title: notification.actionText,
            icon: this.config.iconUrl
          },
          {
            action: 'dismiss',
            title: 'Dismiss',
            icon: this.config.iconUrl
          }
        ];
      }

      // Show notification
      if (this.registration) {
        await this.registration.showNotification(notification.title, options);
      } else {
        new Notification(notification.title, options);
      }
    } catch (error) {
      console.error('Error showing local notification:', error);
    }
  }

  // Send test notification
  async sendTestNotification(userId: string): Promise<boolean> {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      });

      return response.ok;
    } catch (error) {
      console.error('Error sending test notification:', error);
      return false;
    }
  }

  // Get subscription details
  getSubscription(): PushSubscription | null {
    if (!this.subscription) return null;
    return this.convertSubscription(this.subscription);
  }

  // Private methods
  private async sendSubscriptionToServer(userId: string, subscription: globalThis.PushSubscription): Promise<void> {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${userId}/push-subscription`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscription: this.convertSubscription(subscription)
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save subscription to server');
      }
    } catch (error) {
      console.error('Error sending subscription to server:', error);
      throw error;
    }
  }

  private async removeSubscriptionFromServer(userId: string): Promise<void> {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${userId}/push-subscription`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to remove subscription from server');
      }
    } catch (error) {
      console.error('Error removing subscription from server:', error);
      throw error;
    }
  }

  private convertSubscription(subscription: globalThis.PushSubscription): PushSubscription {
    const key = subscription.getKey('p256dh');
    const auth = subscription.getKey('auth');

    return {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: key ? this.arrayBufferToBase64(key) : '',
        auth: auth ? this.arrayBufferToBase64(auth) : ''
      }
    };
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }
}

// Singleton instance
export const pushNotificationService = new PushNotificationService();
export default pushNotificationService;