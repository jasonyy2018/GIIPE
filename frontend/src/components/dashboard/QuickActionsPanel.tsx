'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  shortcut?: string;
  voiceCommand?: string;
  category: 'navigation' | 'content' | 'social' | 'settings' | 'search';
  action: () => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  customizable?: boolean;
  priority?: number; // For ordering
}

interface QuickActionsPanelProps {
  userId: string;
  customActions?: QuickAction[];
  showCategories?: boolean;
  maxActionsPerCategory?: number;
  enableCustomization?: boolean;
  enableKeyboardShortcuts?: boolean;
  enableVoiceCommands?: boolean;
  className?: string;
}

export default function QuickActionsPanel({
  userId,
  customActions = [],
  showCategories = true,
  maxActionsPerCategory = 6,
  enableCustomization = true,
  enableKeyboardShortcuts = true,
  enableVoiceCommands = true,
  className = ""
}: QuickActionsPanelProps) {
  const router = useRouter();
  const [actions, setActions] = useState<QuickAction[]>([]);
  const [visibleActions, setVisibleActions] = useState<string[]>([]);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [showCustomization, setShowCustomization] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  // Initialize default actions
  useEffect(() => {
    const defaultActions: QuickAction[] = [
      // Navigation Actions
      {
        id: 'goto-events',
        title: 'Browse Events',
        description: 'Discover and register for upcoming events',
        icon: 'fas fa-calendar-alt',
        shortcut: 'Ctrl+E',
        voiceCommand: 'browse events',
        category: 'navigation',
        action: () => router.push('/events'),
        priority: 1
      },
      {
        id: 'goto-profile',
        title: 'Edit Profile',
        description: 'Update your profile information and settings',
        icon: 'fas fa-user-edit',
        shortcut: 'Ctrl+P',
        voiceCommand: 'edit profile',
        category: 'navigation',
        action: () => router.push('/dashboard/profile'),
        priority: 2
      },
      {
        id: 'goto-connections',
        title: 'Find People',
        description: 'Connect with other professionals in your field',
        icon: 'fas fa-user-plus',
        shortcut: 'Ctrl+F',
        voiceCommand: 'find people',
        category: 'social',
        action: () => router.push('/users'),
        priority: 3
      },
      {
        id: 'goto-settings',
        title: 'Settings',
        description: 'Manage your account preferences and privacy',
        icon: 'fas fa-cog',
        shortcut: 'Ctrl+,',
        voiceCommand: 'open settings',
        category: 'settings',
        action: () => router.push('/settings'),
        priority: 4
      },
      
      // Search Actions
      {
        id: 'global-search',
        title: 'Global Search',
        description: 'Search across all content types',
        icon: 'fas fa-search',
        shortcut: 'Ctrl+K',
        voiceCommand: 'search',
        category: 'search',
        action: () => {
          // Focus search input if available, otherwise go to search page
          const searchInput = document.querySelector('input[type="search"], input[placeholder*="search" i]') as HTMLInputElement;
          if (searchInput) {
            searchInput.focus();
          } else {
            router.push('/search');
          }
        },
        priority: 1
      },
      {
        id: 'search-events',
        title: 'Search Events',
        description: 'Find specific events by keyword or category',
        icon: 'fas fa-calendar-search',
        shortcut: 'Ctrl+Shift+E',
        voiceCommand: 'search events',
        category: 'search',
        action: () => router.push('/search?type=event'),
        priority: 2
      },
      {
        id: 'search-people',
        title: 'Search People',
        description: 'Find professionals by name, skills, or interests',
        icon: 'fas fa-user-search',
        shortcut: 'Ctrl+Shift+P',
        voiceCommand: 'search people',
        category: 'search',
        action: () => router.push('/search?type=user'),
        priority: 3
      },

      // Content Actions
      {
        id: 'saved-content',
        title: 'Saved Content',
        description: 'View your bookmarked articles and resources',
        icon: 'fas fa-bookmark',
        shortcut: 'Ctrl+B',
        voiceCommand: 'saved content',
        category: 'content',
        action: () => router.push('/saved'),
        priority: 1
      },
      {
        id: 'recent-activity',
        title: 'Activity Feed',
        description: 'See your recent actions and updates',
        icon: 'fas fa-history',
        shortcut: 'Ctrl+H',
        voiceCommand: 'activity feed',
        category: 'content',
        action: () => router.push('/activity'),
        priority: 2
      },
      {
        id: 'notifications',
        title: 'Notifications',
        description: 'Check your latest notifications and messages',
        icon: 'fas fa-bell',
        shortcut: 'Ctrl+N',
        voiceCommand: 'notifications',
        category: 'content',
        action: () => {
          // Try to open notifications dropdown if available
          const notificationButton = document.querySelector('[data-notification-trigger]') as HTMLButtonElement;
          if (notificationButton) {
            notificationButton.click();
          } else {
            router.push('/notifications');
          }
        },
        priority: 3
      },

      // Social Actions
      {
        id: 'my-connections',
        title: 'My Network',
        description: 'View and manage your professional connections',
        icon: 'fas fa-users',
        shortcut: 'Ctrl+Shift+N',
        voiceCommand: 'my network',
        category: 'social',
        action: () => router.push('/connections'),
        priority: 1
      },
      {
        id: 'messages',
        title: 'Messages',
        description: 'Check your private messages and conversations',
        icon: 'fas fa-envelope',
        shortcut: 'Ctrl+M',
        voiceCommand: 'messages',
        category: 'social',
        action: () => router.push('/messages'),
        priority: 2
      },
      {
        id: 'discussions',
        title: 'Discussions',
        description: 'Join ongoing conversations and forums',
        icon: 'fas fa-comments',
        shortcut: 'Ctrl+D',
        voiceCommand: 'discussions',
        category: 'social',
        action: () => router.push('/discussions'),
        priority: 3
      }
    ];

    // Merge with custom actions and sort by priority
    const allActions = [...defaultActions, ...customActions]
      .sort((a, b) => (a.priority || 999) - (b.priority || 999));
    
    setActions(allActions);

    // Load user preferences for visible actions
    loadUserPreferences();
  }, [customActions, router]);

  const loadUserPreferences = () => {
    try {
      const saved = localStorage.getItem(`quickActions_${userId}`);
      if (saved) {
        const preferences = JSON.parse(saved);
        setVisibleActions(preferences.visibleActions || []);
      } else {
        // Default to showing top priority actions from each category
        const defaultVisible = actions?.reduce((acc, action) => {
            const categoryActions = acc.filter(a => actions.find(act => act.id === a)?.category === action.category);
            if (categoryActions.length < 3) { // Show top 3 per category by default
              acc.push(action.id);
            }
            return acc;
          }, [] as string[]);
        setVisibleActions(defaultVisible);
      }
    } catch (error) {
      console.error('Error loading quick action preferences:', error);
    }
  };

  const saveUserPreferences = (newVisibleActions: string[]) => {
    try {
      const preferences = {
        visibleActions: newVisibleActions,
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem(`quickActions_${userId}`, JSON.stringify(preferences));
      setVisibleActions(newVisibleActions);
    } catch (error) {
      console.error('Error saving quick action preferences:', error);
    }
  };

  // Voice recognition setup
  useEffect(() => {
    if (enableVoiceCommands && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'en-US';

      recognitionInstance.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript.toLowerCase();
        handleVoiceCommand(transcript);
        setIsListening(false);
      };

      recognitionInstance.onerror = () => {
        setIsListening(false);
      };

      recognitionInstance.onend = () => {
        setIsListening(false);
      };

      setRecognition(recognitionInstance);
    }
  }, [enableVoiceCommands, actions]);

  // Keyboard shortcuts setup
  useEffect(() => {
    if (!enableKeyboardShortcuts) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if we're in an input field
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const shortcut = `${e.ctrlKey || e.metaKey ? 'Ctrl+' : ''}${e.shiftKey ? 'Shift+' : ''}${e.altKey ? 'Alt+' : ''}${e.key}`;
      
      const action = actions.find(a => a.shortcut === shortcut);
      if (action && visibleActions.includes(action.id)) {
        e.preventDefault();
        executeAction(action);
      }

      // Special shortcut for voice commands
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'V') {
        e.preventDefault();
        startVoiceCommand();
      }

      // Quick action panel toggle
      if ((e.ctrlKey || e.metaKey) && e.key === 'j') {
        e.preventDefault();
        setShowCustomization(!showCustomization);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enableKeyboardShortcuts, actions, visibleActions, showCustomization]);

  const executeAction = async (action: QuickAction) => {
    if (action.disabled || loading[action.id]) return;

    setLoading(prev => ({ ...prev, [action.id]: true }));
    try {
      await action.action();
    } catch (error) {
      console.error(`Error executing action ${action.id}:`, error);
    } finally {
      setLoading(prev => ({ ...prev, [action.id]: false }));
    }
  };

  const handleVoiceCommand = (transcript: string) => {
    const matchedAction = actions.find(action => 
      action.voiceCommand && 
      transcript.includes(action.voiceCommand.toLowerCase()) &&
      visibleActions.includes(action.id)
    );

    if (matchedAction) {
      executeAction(matchedAction);
    } else {
      console.log('Voice command not recognized:', transcript);
    }
  };

  const startVoiceCommand = () => {
    if (recognition && enableVoiceCommands) {
      setIsListening(true);
      recognition.start();
    }
  };

  const toggleActionVisibility = (actionId: string) => {
    const newVisibleActions = visibleActions.includes(actionId)
      ? visibleActions.filter(id => id !== actionId)
      : [...visibleActions, actionId];
    
    saveUserPreferences(newVisibleActions);
  };

  const getVariantClasses = (variant: string = 'primary') => {
    switch (variant) {
      case 'primary':
        return 'border-primary bg-primary/5 hover:bg-primary/10 text-primary';
      case 'secondary':
        return 'border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-700';
      case 'success':
        return 'border-green-300 bg-green-50 hover:bg-green-100 text-green-700';
      case 'warning':
        return 'border-yellow-300 bg-yellow-50 hover:bg-yellow-100 text-yellow-700';
      case 'danger':
        return 'border-red-300 bg-red-50 hover:bg-red-100 text-red-700';
      default:
        return 'border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-700';
    }
  };

  const visibleActionsByCategory = actions?.filter(action => visibleActions.includes(action.id))
    .reduce((acc, action) => {
      if (!acc[action.category]) {
        acc[action.category] = [];
      }
      acc[action.category].push(action);
      return acc;
    }, {} as Record<string, QuickAction[]>);

  const categoryIcons = {
    navigation: 'fas fa-compass',
    content: 'fas fa-file-alt',
    social: 'fas fa-users',
    settings: 'fas fa-cog',
    search: 'fas fa-search'
  };

  const categoryLabels = {
    navigation: 'Navigation',
    content: 'Content',
    social: 'Social',
    settings: 'Settings',
    search: 'Search'
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Voice Command Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-semibold text-gray-800">Quick Actions</h3>
          {enableKeyboardShortcuts && (
            <div className="hidden sm:flex items-center space-x-1 text-xs text-gray-500">
              <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">⌘</kbd>
              <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">J</kbd>
              <span className="ml-1">to customize</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Voice Command Button */}
          {enableVoiceCommands && recognition && (
            <button
              onClick={startVoiceCommand}
              disabled={isListening}
              className={`p-2 rounded-lg transition-colors ${
                isListening 
                  ? 'bg-red-100 text-red-600 animate-pulse' 
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }`}
              title="Voice commands (Ctrl+Shift+V)"
            >
              <i className={`fas ${isListening ? 'fa-microphone-slash' : 'fa-microphone'}`}></i>
            </button>
          )}
          
          {/* Customization Button */}
          {enableCustomization && (
            <button
              onClick={() => setShowCustomization(!showCustomization)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Customize quick actions"
            >
              <i className="fas fa-edit"></i>
            </button>
          )}
        </div>
      </div>

      {/* Customization Panel */}
      {showCustomization && enableCustomization && (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h4 className="font-medium text-gray-700 mb-3">Customize Quick Actions</h4>
          <p className="text-sm text-gray-600 mb-4">
            Select which actions to show in your quick actions panel. You can also use keyboard shortcuts or voice commands.
          </p>
          
          <div className="space-y-4">
            {Object.entries(categoryLabels).map(([category, label]) => {
              const categoryActions = actions.filter(a => a.category === category);
              if (categoryActions.length === 0) return null;

              return (
                <div key={category}>
                  <h5 className="font-medium text-gray-600 mb-2 flex items-center">
                    <i className={`${categoryIcons[category as keyof typeof categoryIcons]} mr-2`}></i>
                    {label}
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {categoryActions.map(action => (
                      <label
                        key={action.id}
                        className="flex items-center space-x-3 p-3 rounded-lg hover:bg-white cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={visibleActions.includes(action.id)}
                          onChange={() => toggleActionVisibility(action.id)}
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <i className={`${action.icon} text-sm text-gray-500`}></i>
                            <span className="font-medium text-sm">{action.title}</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {action.shortcut && (
                              <span className="mr-3">
                                <i className="fas fa-keyboard mr-1"></i>
                                {action.shortcut}
                              </span>
                            )}
                            {action.voiceCommand && (
                              <span>
                                <i className="fas fa-microphone mr-1"></i>
                                "{action.voiceCommand}"
                              </span>
                            )}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Actions Grid */}
      {showCategories ? (
        <div className="space-y-6">
          {Object.entries(visibleActionsByCategory).map(([category, categoryActions]) => (
            <div key={category}>
              <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                <i className={`${categoryIcons[category as keyof typeof categoryIcons]} mr-2`}></i>
                {categoryLabels[category as keyof typeof categoryLabels]}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryActions.slice(0, maxActionsPerCategory).map(action => (
                  <button
                    key={action.id}
                    onClick={() => executeAction(action)}
                    disabled={action.disabled || loading[action.id]}
                    className={`
                      p-4 border-2 rounded-lg transition-all duration-200 text-left
                      ${getVariantClasses(action.variant)}
                      ${action.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'}
                      ${loading[action.id] ? 'animate-pulse' : ''}
                    `}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        {loading[action.id] ? (
                          <i className="fas fa-spinner fa-spin text-xl"></i>
                        ) : (
                          <i className={`${action.icon} text-xl`}></i>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="font-semibold text-sm mb-1">{action.title}</h5>
                        <p className="text-xs opacity-80 line-clamp-2 mb-2">{action.description}</p>
                        {(action.shortcut || action.voiceCommand) && (
                          <div className="flex items-center space-x-2 text-xs opacity-60">
                            {action.shortcut && (
                              <span className="flex items-center">
                                <i className="fas fa-keyboard mr-1"></i>
                                {action.shortcut}
                              </span>
                            )}
                            {action.voiceCommand && (
                              <span className="flex items-center">
                                <i className="fas fa-microphone mr-1"></i>
                                "{action.voiceCommand}"
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {actions?.filter(action => visibleActions.includes(action.id))
            .map(action => (
              <button
                key={action.id}
                onClick={() => executeAction(action)}
                disabled={action.disabled || loading[action.id]}
                className={`
                  p-4 border-2 rounded-lg transition-all duration-200 text-left
                  ${getVariantClasses(action.variant)}
                  ${action.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'}
                  ${loading[action.id] ? 'animate-pulse' : ''}
                `}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    {loading[action.id] ? (
                      <i className="fas fa-spinner fa-spin text-xl"></i>
                    ) : (
                      <i className={`${action.icon} text-xl`}></i>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="font-semibold text-sm mb-1">{action.title}</h5>
                    <p className="text-xs opacity-80 line-clamp-2 mb-2">{action.description}</p>
                    {(action.shortcut || action.voiceCommand) && (
                      <div className="flex items-center space-x-2 text-xs opacity-60">
                        {action.shortcut && (
                          <span className="flex items-center">
                            <i className="fas fa-keyboard mr-1"></i>
                            {action.shortcut}
                          </span>
                        )}
                        {action.voiceCommand && (
                          <span className="flex items-center">
                            <i className="fas fa-microphone mr-1"></i>
                            "{action.voiceCommand}"
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
        </div>
      )}

      {/* Help Text */}
      {(enableKeyboardShortcuts || enableVoiceCommands) && (
        <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
          <div className="flex items-center space-x-4">
            {enableKeyboardShortcuts && (
              <span>
                <i className="fas fa-keyboard mr-1"></i>
                Use keyboard shortcuts for quick access
              </span>
            )}
            {enableVoiceCommands && recognition && (
              <span>
                <i className="fas fa-microphone mr-1"></i>
                Say voice commands or press Ctrl+Shift+V
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}