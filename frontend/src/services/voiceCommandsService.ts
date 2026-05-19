/**
 * Voice Commands Service
 * Provides voice command functionality for accessibility
 */

export interface VoiceCommand {
  id: string;
  phrases: string[]; // Multiple phrases that trigger the same command
  description: string;
  category: 'navigation' | 'search' | 'content' | 'social' | 'system';
  action: () => void | Promise<void>;
  enabled?: boolean;
  confidence?: number; // Minimum confidence level (0-1)
}

export interface VoiceCommandCategory {
  id: string;
  name: string;
  icon: string;
  commands: VoiceCommand[];
}

export interface VoiceRecognitionOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
}

class VoiceCommandsService {
  private commands: Map<string, VoiceCommand> = new Map();
  private recognition: any = null;
  private listening = false;
  private supported = false;
  private options: VoiceRecognitionOptions = {
    language: 'en-US',
    continuous: false,
    interimResults: false,
    maxAlternatives: 1
  };

  constructor() {
    this.initializeRecognition();
  }

  /**
   * Initialize speech recognition
   */
  private initializeRecognition(): void {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.supported = true;
      this.setupRecognition();
    } else {
      console.warn('Speech recognition not supported in this browser');
      this.supported = false;
    }
  }

  /**
   * Setup recognition event handlers
   */
  private setupRecognition(): void {
    if (!this.recognition) return;

    this.recognition.continuous = this.options.continuous;
    this.recognition.interimResults = this.options.interimResults;
    this.recognition.lang = this.options.language;
    this.recognition.maxAlternatives = this.options.maxAlternatives;

    this.recognition.onstart = () => {
      this.listening = true;
      this.onListeningStart();
    };

    this.recognition.onend = () => {
      this.listening = false;
      this.onListeningEnd();
    };

    this.recognition.onresult = (event: any) => {
      const results = Array.from(event.results);
      const transcript = results?.map((result: any) => result[0].transcript)
        .join(' ')
        .toLowerCase()
        .trim();

      if (transcript) {
        this.processVoiceCommand(transcript).catch(console.error);
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      this.listening = false;
      this.onError(event.error);
    };
  }

  /**
   * Register a voice command
   */
  register(command: VoiceCommand): void {
    this.commands.set(command.id, command);
  }

  /**
   * Unregister a voice command
   */
  unregister(commandId: string): void {
    this.commands.delete(commandId);
  }

  /**
   * Start listening for voice commands
   */
  startListening(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.supported) {
        reject(new Error('Speech recognition not supported'));
        return;
      }

      if (this.listening) {
        resolve();
        return;
      }

      try {
        this.recognition.start();
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop listening for voice commands
   */
  stopListening(): void {
    if (this.recognition && this.listening) {
      this.recognition.stop();
    }
  }

  /**
   * Check if voice recognition is supported
   */
  isSupported(): boolean {
    return this.supported;
  }

  /**
   * Check if currently listening
   */
  isListening(): boolean {
    return this.listening;
  }

  /**
   * Get all registered commands grouped by category
   */
  getCommandsByCategory(): VoiceCommandCategory[] {
    const categories: Record<string, VoiceCommandCategory> = {};

    Array.from(this.commands.values()).forEach(command => {
      if (!categories[command.category]) {
        categories[command.category] = {
          id: command.category,
          name: this.getCategoryName(command.category),
          icon: this.getCategoryIcon(command.category),
          commands: []
        };
      }
      categories[command.category].commands.push(command);
    });

    return Object.values(categories);
  }

  /**
   * Process voice command transcript
   */
  private async processVoiceCommand(transcript: string): Promise<void> {
    let bestMatch: VoiceCommand | null = null;
    let bestScore = 0;

    // Find the best matching command
    const commands = Array.from(this.commands.values());
    for (const command of commands) {
      if (!command.enabled && command.enabled !== undefined) continue;

      for (const phrase of command.phrases) {
        const score = this.calculateSimilarity(transcript, phrase.toLowerCase());
        if (score > bestScore && score >= (command.confidence || 0.7)) {
          bestMatch = command;
          bestScore = score;
        }
      }
    }

    if (bestMatch) {
      try {
        await bestMatch.action();
        this.onCommandExecuted(bestMatch, transcript, bestScore);
      } catch (error) {
        console.error('Error executing voice command:', error);
        this.onCommandError(bestMatch, error);
      }
    } else {
      this.onCommandNotRecognized(transcript);
    }
  }

  /**
   * Calculate similarity between two strings
   */
  private calculateSimilarity(str1: string, str2: string): number {
    // Simple word-based similarity calculation
    const words1 = str1.split(' ').filter(w => w.length > 0);
    const words2 = str2.split(' ').filter(w => w.length > 0);
    
    if (words1.length === 0 || words2.length === 0) return 0;

    // Check for exact match
    if (str1 === str2) return 1;

    // Check if str1 contains str2 or vice versa
    if (str1.includes(str2) || str2.includes(str1)) return 0.9;

    // Calculate word overlap
    const commonWords = words1.filter(word => words2.includes(word));
    const similarity = (commonWords.length * 2) / (words1.length + words2.length);

    return similarity;
  }

  /**
   * Register default voice commands
   */
  registerDefaultCommands(router: any): void {
    const defaultCommands: VoiceCommand[] = [
      // Navigation commands
      {
        id: 'goto-dashboard',
        phrases: ['go to dashboard', 'open dashboard', 'dashboard', 'home'],
        description: 'Navigate to dashboard',
        category: 'navigation',
        action: () => router.push('/dashboard')
      },
      {
        id: 'goto-events',
        phrases: ['browse events', 'show events', 'events', 'find events'],
        description: 'Browse events',
        category: 'navigation',
        action: () => router.push('/events')
      },
      {
        id: 'goto-profile',
        phrases: ['edit profile', 'my profile', 'profile', 'account'],
        description: 'Edit profile',
        category: 'navigation',
        action: () => router.push('/dashboard/profile')
      },
      {
        id: 'goto-settings',
        phrases: ['open settings', 'settings', 'preferences', 'configuration'],
        description: 'Open settings',
        category: 'navigation',
        action: () => router.push('/settings')
      },

      // Search commands
      {
        id: 'global-search',
        phrases: ['search', 'find', 'look for', 'global search'],
        description: 'Open global search',
        category: 'search',
        action: () => {
          const searchInput = document.querySelector('input[type="search"], input[placeholder*="search" i]') as HTMLInputElement;
          if (searchInput) {
            searchInput.focus();
          } else {
            router.push('/search');
          }
        }
      },
      {
        id: 'search-events',
        phrases: ['search events', 'find events', 'event search'],
        description: 'Search for events',
        category: 'search',
        action: () => router.push('/search?type=event')
      },
      {
        id: 'search-people',
        phrases: ['search people', 'find people', 'people search', 'find users'],
        description: 'Search for people',
        category: 'search',
        action: () => router.push('/search?type=user')
      },

      // Content commands
      {
        id: 'saved-content',
        phrases: ['saved content', 'bookmarks', 'saved items', 'my saves'],
        description: 'View saved content',
        category: 'content',
        action: () => router.push('/saved')
      },
      {
        id: 'notifications',
        phrases: ['notifications', 'alerts', 'messages', 'updates'],
        description: 'Open notifications',
        category: 'content',
        action: () => {
          const notificationButton = document.querySelector('[data-notification-trigger]') as HTMLButtonElement;
          if (notificationButton) {
            notificationButton.click();
          } else {
            router.push('/notifications');
          }
        }
      },
      {
        id: 'activity-feed',
        phrases: ['activity feed', 'recent activity', 'activity', 'history'],
        description: 'View activity feed',
        category: 'content',
        action: () => router.push('/activity')
      },

      // Social commands
      {
        id: 'connections',
        phrases: ['find people', 'connections', 'network', 'connect'],
        description: 'Find people to connect with',
        category: 'social',
        action: () => router.push('/users')
      },
      {
        id: 'my-network',
        phrases: ['my network', 'my connections', 'network'],
        description: 'View my network',
        category: 'social',
        action: () => router.push('/connections')
      },
      {
        id: 'discussions',
        phrases: ['discussions', 'forums', 'conversations', 'chat'],
        description: 'Join discussions',
        category: 'social',
        action: () => router.push('/discussions')
      },

      // System commands
      {
        id: 'help',
        phrases: ['help', 'assistance', 'support', 'how to'],
        description: 'Show help',
        category: 'system',
        action: () => this.showVoiceCommandsHelp()
      },
      {
        id: 'stop-listening',
        phrases: ['stop listening', 'stop', 'cancel', 'nevermind'],
        description: 'Stop voice recognition',
        category: 'system',
        action: () => this.stopListening()
      },
      {
        id: 'refresh',
        phrases: ['refresh page', 'reload', 'refresh'],
        description: 'Refresh the page',
        category: 'system',
        action: () => window.location.reload()
      }
    ];

    defaultCommands.forEach(command => this.register(command));
  }

  /**
   * Show voice commands help
   */
  private showVoiceCommandsHelp(): void {
    const existingModal = document.getElementById('voice-commands-help-modal');
    if (existingModal) {
      existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'voice-commands-help-modal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50';
    
    const categories = this.getCommandsByCategory();
    
    modal.innerHTML = `
      <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
        <div class="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 class="text-xl font-semibold text-gray-800 flex items-center">
            <i class="fas fa-microphone mr-2"></i>
            Voice Commands
          </h2>
          <button class="text-gray-400 hover:text-gray-600" onclick="this.closest('#voice-commands-help-modal').remove()">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
        <div class="p-6 overflow-y-auto max-h-[60vh]">
          <div class="mb-4 p-4 bg-blue-50 rounded-lg">
            <p class="text-sm text-primary-dark">
              <i class="fas fa-info-circle mr-1"></i>
              Say any of the phrases below to execute the corresponding action. Voice recognition works best in quiet environments.
            </p>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            ${categories.map(category => `
              <div>
                <h3 class="flex items-center text-lg font-medium text-gray-700 mb-4">
                  <i class="${category.icon} mr-2"></i>
                  ${category.name}
                </h3>
                <div class="space-y-3">
                  ${category.commands.map(command => `
                    <div class="border border-gray-200 rounded-lg p-3">
                      <div class="font-medium text-sm text-gray-800 mb-2">${command.description}</div>
                      <div class="flex flex-wrap gap-1">
                        ${command.phrases.map(phrase => `
                          <span class="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">"${phrase}"</span>
                        `).join('')}
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <p class="text-sm text-gray-600">
            <i class="fas fa-microphone mr-1"></i>
            Click the microphone button or use keyboard shortcut to start voice recognition
          </p>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Close on click outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });

    // Close on escape key
    const escapeHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        modal.remove();
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);
  }

  /**
   * Event handlers (can be overridden)
   */
  private onListeningStart(): void {
    // Override in implementation
  }

  private onListeningEnd(): void {
    // Override in implementation
  }

  private onCommandExecuted(command: VoiceCommand, transcript: string, confidence: number): void {
    console.log(`Voice command executed: ${command.id} (confidence: ${confidence.toFixed(2)})`);
  }

  private onCommandError(command: VoiceCommand, error: any): void {
    console.error(`Voice command error: ${command.id}`, error);
  }

  private onCommandNotRecognized(transcript: string): void {
    console.log(`Voice command not recognized: "${transcript}"`);
  }

  private onError(error: string): void {
    console.error('Voice recognition error:', error);
  }

  /**
   * Get category display name
   */
  private getCategoryName(category: string): string {
    const names: Record<string, string> = {
      navigation: 'Navigation',
      search: 'Search',
      content: 'Content',
      social: 'Social',
      system: 'System'
    };
    return names[category] || category;
  }

  /**
   * Get category icon
   */
  private getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      navigation: 'fas fa-compass',
      search: 'fas fa-search',
      content: 'fas fa-file-alt',
      social: 'fas fa-users',
      system: 'fas fa-cog'
    };
    return icons[category] || 'fas fa-microphone';
  }
}

// Export singleton instance
export const voiceCommandsService = new VoiceCommandsService();

// Export hook for React components
export function useVoiceCommands(router?: any) {
  const registerCommands = (commands: VoiceCommand[]) => {
    commands.forEach(command => voiceCommandsService.register(command));
  };

  const registerDefaults = () => {
    if (router) {
      voiceCommandsService.registerDefaultCommands(router);
    }
  };

  const startListening = () => {
    return voiceCommandsService.startListening();
  };

  const stopListening = () => {
    voiceCommandsService.stopListening();
  };

  const getCommands = () => {
    return voiceCommandsService.getCommandsByCategory();
  };

  const isSupported = () => {
    return voiceCommandsService.isSupported();
  };

  const isListening = () => {
    return voiceCommandsService.isListening();
  };

  return {
    registerCommands,
    registerDefaults,
    startListening,
    stopListening,
    getCommands,
    isSupported,
    isListening,
    service: voiceCommandsService
  };
}