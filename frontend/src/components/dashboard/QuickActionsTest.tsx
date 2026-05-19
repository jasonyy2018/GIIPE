'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import QuickActionsPanel from './QuickActionsPanel';
import { useKeyboardShortcuts } from '../../services/keyboardShortcutsService';
import { useVoiceCommands } from '../../services/voiceCommandsService';

export default function QuickActionsTest() {
  const router = useRouter();
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isTestingVoice, setIsTestingVoice] = useState(false);

  const { registerDefaults: registerKeyboardDefaults, getShortcuts } = useKeyboardShortcuts(router);
  const { registerDefaults: registerVoiceDefaults, isSupported, startListening, stopListening } = useVoiceCommands(router);

  useEffect(() => {
    // Register default shortcuts and commands
    registerKeyboardDefaults();
    registerVoiceDefaults();
    
    addTestResult('�?Services initialized successfully');
    addTestResult(`🎤 Voice commands supported: ${isSupported() ? 'Yes' : 'No'}`);
    addTestResult(`⌨️ Keyboard shortcuts registered: ${getShortcuts().length} categories`);
  }, []);

  const addTestResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testKeyboardShortcuts = () => {
    const shortcuts = getShortcuts();
    addTestResult(`⌨️ Found ${shortcuts.reduce((acc, cat) => acc + cat.shortcuts.length, 0)} keyboard shortcuts`);
    
    shortcuts.forEach(category => {
      addTestResult(`  📁 ${category.name}: ${category.shortcuts.length} shortcuts`);
    });
  };

  const testVoiceCommands = async () => {
    if (!isSupported()) {
      addTestResult('�?Voice commands not supported in this browser');
      return;
    }

    try {
      setIsTestingVoice(true);
      addTestResult('🎤 Starting voice recognition test...');
      await startListening();
      addTestResult('🎤 Voice recognition started - try saying "dashboard" or "events"');
      
      // Auto-stop after 5 seconds for testing
      setTimeout(() => {
        stopListening();
        setIsTestingVoice(false);
        addTestResult('🎤 Voice recognition test completed');
      }, 5000);
    } catch (error) {
      addTestResult(`�?Voice recognition error: ${error}`);
      setIsTestingVoice(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="space-y-6 p-6 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">Quick Actions Test</h2>
        <div className="flex space-x-2">
          <button
            onClick={testKeyboardShortcuts}
            className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-primary transition-colors"
          >
            Test Keyboard
          </button>
          <button
            onClick={testVoiceCommands}
            disabled={!isSupported() || isTestingVoice}
            className="px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isTestingVoice ? 'Listening...' : 'Test Voice'}
          </button>
          <button
            onClick={clearResults}
            className="px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Test Results */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="font-medium text-gray-800 mb-3">Test Results</h3>
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {testResults.length === 0 ? (
            <p className="text-gray-500 text-sm">No test results yet. Click the test buttons above.</p>
          ) : (
            testResults.map((result, index) => (
              <div key={index} className="text-sm font-mono text-gray-700 bg-gray-50 p-2 rounded">
                {result}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-primary-dark mb-2">Testing Instructions</h3>
        <div className="text-sm text-blue-700 space-y-1">
          <p>�?<strong>Keyboard Shortcuts:</strong> Try pressing Ctrl+K for search, Ctrl+E for events, etc.</p>
          <p>�?<strong>Voice Commands:</strong> Click "Test Voice" and say commands like "dashboard", "events", "search"</p>
          <p>�?<strong>Quick Actions:</strong> Use the panel below to test customizable actions</p>
        </div>
      </div>

      {/* Quick Actions Panel */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="font-medium text-gray-800 mb-4">Quick Actions Panel</h3>
        <QuickActionsPanel
          userId="test-user"
          showCategories={true}
          maxActionsPerCategory={4}
          enableCustomization={true}
          enableKeyboardShortcuts={true}
          enableVoiceCommands={true}
        />
      </div>
    </div>
  );
}