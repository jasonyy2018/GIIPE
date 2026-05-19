'use client';

import { useState, useEffect } from 'react';
import { useVoiceCommands } from '../../services/voiceCommandsService';
import type { VoiceCommandCategory, VoiceCommand } from '../../services/voiceCommandsService';

interface VoiceCommandsSettingsProps {
  className?: string;
}

export default function VoiceCommandsSettings({ className = "" }: VoiceCommandsSettingsProps) {
  const { getCommands, isSupported, isListening, startListening, stopListening } = useVoiceCommands();
  const [categories, setCategories] = useState<VoiceCommandCategory[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [testingVoice, setTestingVoice] = useState(false);
  const [lastRecognized, setLastRecognized] = useState<string>('');

  useEffect(() => {
    loadCommands();
  }, []);

  const loadCommands = () => {
    const commandCategories = getCommands();
    setCategories(commandCategories);
  };

  const handleTestVoice = async () => {
    if (isListening()) {
      stopListening();
      setTestingVoice(false);
    } else {
      try {
        setTestingVoice(true);
        await startListening();
      } catch (error) {
        console.error('Error starting voice recognition:', error);
        setTestingVoice(false);
      }
    }
  };

  const filteredCategories = categories.map(category => ({
    ...category,
    commands: category.commands.filter(command => {
      const matchesSearch = searchTerm === '' || 
        command.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        command.phrases.some(phrase => phrase.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCategory = selectedCategory === 'all' || category.id === selectedCategory;
      
      return matchesSearch && matchesCategory;
    })
  })).filter(category => category.commands.length > 0);

  const allCategories = [
    { id: 'all', name: 'All Categories', icon: 'fas fa-th' },
    ...categories.map(cat => ({ id: cat.id, name: cat.name, icon: cat.icon }))
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Voice Commands</h2>
          <p className="text-sm text-gray-600 mt-1">
            Use voice commands for hands-free navigation and accessibility
          </p>
        </div>
        
        {/* Voice Test Button */}
        {isSupported() && (
          <button
            onClick={handleTestVoice}
            disabled={!isSupported()}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              testingVoice || isListening()
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-primary text-white hover:bg-primary-dark'
            }`}
          >
            <i className={`fas ${testingVoice || isListening() ? 'fa-microphone-slash' : 'fa-microphone'}`}></i>
            <span>{testingVoice || isListening() ? 'Stop Listening' : 'Test Voice'}</span>
          </button>
        )}
      </div>

      {/* Browser Support Check */}
      {!isSupported() && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <i className="fas fa-exclamation-triangle text-red-600 mr-2"></i>
            <div>
              <p className="text-red-800 font-medium">Voice commands not supported</p>
              <p className="text-red-700 text-sm mt-1">
                Your browser doesn't support speech recognition. Try using Chrome, Edge, or Safari.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Voice Status */}
      {isSupported() && (
        <div className={`border rounded-lg p-4 ${
          testingVoice || isListening() 
            ? 'bg-red-50 border-red-200' 
            : 'bg-green-50 border-green-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <i className={`fas ${
                testingVoice || isListening() ? 'fa-microphone text-red-600' : 'fa-microphone-slash text-green-600'
              } mr-2`}></i>
              <span className={`font-medium ${
                testingVoice || isListening() ? 'text-red-800' : 'text-green-800'
              }`}>
                {testingVoice || isListening() ? 'Listening for commands...' : 'Voice recognition ready'}
              </span>
            </div>
            {(testingVoice || isListening()) && (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-red-700">Say a command</span>
              </div>
            )}
          </div>
          {lastRecognized && (
            <p className="text-sm text-gray-600 mt-2">
              Last recognized: "{lastRecognized}"
            </p>
          )}
        </div>
      )}

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
            <input
              type="text"
              placeholder="Search voice commands..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>
        
        <div className="sm:w-48">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            {allCategories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Commands List */}
      <div className="space-y-6">
        {filteredCategories.length === 0 ? (
          <div className="text-center py-8">
            <i className="fas fa-search text-4xl text-gray-300 mb-4"></i>
            <p className="text-gray-500">No voice commands found matching your search.</p>
          </div>
        ) : (
          filteredCategories.map(category => (
            <div key={category.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <h3 className="flex items-center text-lg font-medium text-gray-800">
                  <i className={`${category.icon} mr-3 text-primary`}></i>
                  {category.name}
                  <span className="ml-2 text-sm text-gray-500">
                    ({category.commands.length} command{category.commands.length !== 1 ? 's' : ''})
                  </span>
                </h3>
              </div>
              
              <div className="divide-y divide-gray-200">
                {category.commands.map(command => (
                  <div key={command.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-800 mb-2">
                          {command.description}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {command.phrases.map((phrase, index) => (
                            <span
                              key={index}
                              className="px-3 py-1 bg-light text-primary-dark text-sm rounded-full"
                            >
                              "{phrase}"
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <div className="ml-4 flex items-center">
                        <i className="fas fa-microphone text-gray-400"></i>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="flex items-center text-lg font-medium text-primary-dark mb-3">
          <i className="fas fa-info-circle mr-2"></i>
          Tips for Using Voice Commands
        </h3>
        <div className="space-y-2 text-sm text-blue-700">
          <p>�?Speak clearly and at a normal pace for best recognition</p>
          <p>�?Use voice commands in quiet environments for better accuracy</p>
          <p>�?You can say any of the listed phrases to trigger a command</p>
          <p>�?Voice recognition works best with Chrome, Edge, and Safari browsers</p>
          <p>�?Allow microphone access when prompted by your browser</p>
          <p>�?Say "stop listening" or "cancel" to stop voice recognition</p>
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="flex items-center text-lg font-medium text-gray-800 mb-3">
          <i className="fas fa-shield-alt mr-2"></i>
          Privacy & Security
        </h3>
        <div className="space-y-2 text-sm text-gray-600">
          <p>�?Voice recognition is processed locally in your browser</p>
          <p>�?No audio data is sent to our servers</p>
          <p>�?Voice commands only work when you explicitly activate them</p>
          <p>�?You can disable voice commands at any time</p>
        </div>
      </div>

      {/* Quick Test Section */}
      {isSupported() && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="flex items-center text-lg font-medium text-gray-800 mb-3">
            <i className="fas fa-microphone mr-2"></i>
            Try Voice Commands
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Click "Test Voice" above and try saying one of these commands:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {categories.slice(0, 1).map(category => 
              category.commands.slice(0, 6).map(command => (
                <div key={command.id} className="p-3 bg-white rounded border">
                  <div className="font-medium text-sm text-gray-700 mb-1">
                    {command.description}
                  </div>
                  <div className="text-xs text-primary">
                    Say: "{command.phrases[0]}"
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}