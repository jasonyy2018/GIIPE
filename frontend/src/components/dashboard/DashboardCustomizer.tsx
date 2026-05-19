'use client';

import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { dashboardCustomizationService } from '@/services/dashboardCustomizationService';
import type { 
  DashboardLayout, 
  DashboardTheme, 
  DashboardPreferences, 
  WidgetConfig 
} from '@/types/dashboard';

interface DashboardCustomizerProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (layout: DashboardLayout) => void;
}

export default function DashboardCustomizer({ 
  userId, 
  isOpen, 
  onClose, 
  onSave 
}: DashboardCustomizerProps) {
  const [preferences, setPreferences] = useState<DashboardPreferences | null>(null);
  const [currentLayout, setCurrentLayout] = useState<DashboardLayout | null>(null);
  const [availableWidgets, setAvailableWidgets] = useState<WidgetConfig[]>([]);
  const [availableThemes, setAvailableThemes] = useState<DashboardTheme[]>([]);
  const [activeTab, setActiveTab] = useState<'layout' | 'widgets' | 'themes' | 'settings'>('layout');
  const [previewMode, setPreviewMode] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, userId]);

  const loadData = () => {
    const prefs = dashboardCustomizationService.getPreferences(userId);
    const layout = dashboardCustomizationService.getCurrentLayout(userId);
    const widgets = dashboardCustomizationService.getAvailableWidgets();
    const themes = dashboardCustomizationService.getAvailableThemes();

    setPreferences(prefs);
    setCurrentLayout(layout);
    setAvailableWidgets(widgets);
    setAvailableThemes(themes);
    setHasChanges(false);
  };

  const handleSave = () => {
    if (currentLayout && preferences) {
      dashboardCustomizationService.saveLayout(userId, currentLayout);
      dashboardCustomizationService.updatePreference(userId, 'currentLayout', currentLayout.id);
      onSave(currentLayout);
      setHasChanges(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      if (confirm('You have unsaved changes. Are you sure you want to cancel?')) {
        loadData();
        onClose();
      }
    } else {
      onClose();
    }
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !currentLayout) return;

    const { source, destination } = result;
    
    if (source.droppableId === 'available-widgets' && destination.droppableId === 'dashboard-grid') {
      // Adding new widget
      const widgetConfig = availableWidgets.find(w => w.id === result.draggableId);
      if (widgetConfig) {
        addWidgetToLayout(widgetConfig);
      }
    } else if (source.droppableId === 'dashboard-grid' && destination.droppableId === 'dashboard-grid') {
      // Reordering widgets
      const newWidgets = Array.from(currentLayout.widgets);
      const [reorderedWidget] = newWidgets.splice(source.index, 1);
      newWidgets.splice(destination.index, 0, reorderedWidget);
      
      setCurrentLayout({
        ...currentLayout,
        widgets: newWidgets
      });
      setHasChanges(true);
    }
  };

  const addWidgetToLayout = (widgetConfig: WidgetConfig) => {
    if (!currentLayout) return;

    const newWidget = {
      id: `${widgetConfig.id}-${Date.now()}`,
      title: widgetConfig.name,
      component: widgetConfig.component,
      enabled: true,
      position: {
        x: 0,
        y: currentLayout.widgets.length,
        width: widgetConfig.defaultSize.width,
        height: widgetConfig.defaultSize.height
      }
    };

    setCurrentLayout({
      ...currentLayout,
      widgets: [...currentLayout.widgets, newWidget]
    });
    setHasChanges(true);
  };

  const removeWidget = (widgetId: string) => {
    if (!currentLayout) return;

    setCurrentLayout({
      ...currentLayout,
      widgets: currentLayout.widgets.filter(w => w.id !== widgetId)
    });
    setHasChanges(true);
  };

  const toggleWidget = (widgetId: string) => {
    if (!currentLayout) return;

    setCurrentLayout({
      ...currentLayout,
      widgets: currentLayout.widgets.map(w => 
        w.id === widgetId ? { ...w, enabled: !w.enabled } : w
      )
    });
    setHasChanges(true);
  };

  const updateTheme = (themeId: string) => {
    if (!preferences) return;

    dashboardCustomizationService.updatePreference(userId, 'currentTheme', themeId);
    setPreferences({
      ...preferences,
      currentTheme: themeId
    });
  };

  const updateLayoutSettings = (updates: Partial<DashboardLayout>) => {
    if (!currentLayout) return;

    setCurrentLayout({
      ...currentLayout,
      ...updates
    });
    setHasChanges(true);
  };

  const createNewLayout = () => {
    const name = prompt('Enter layout name:');
    if (name) {
      const newLayout = dashboardCustomizationService.createLayout(userId, name, currentLayout?.id);
      setCurrentLayout(newLayout);
      setHasChanges(true);
    }
  };

  const duplicateLayout = () => {
    if (!currentLayout) return;
    
    const name = prompt('Enter new layout name:', `${currentLayout.name} Copy`);
    if (name) {
      const newLayout = dashboardCustomizationService.createLayout(userId, name, currentLayout.id);
      setCurrentLayout(newLayout);
      setHasChanges(true);
    }
  };

  if (!isOpen || !preferences || !currentLayout) return null;

  const currentTheme = availableThemes.find(t => t.id === preferences.currentTheme);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-5/6 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Dashboard Customizer</h2>
            <p className="text-gray-600">Customize your dashboard layout, widgets, and appearance</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setPreviewMode(!previewMode)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                previewMode 
                  ? 'bg-primary text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <i className="fas fa-eye mr-2"></i>
              {previewMode ? 'Exit Preview' : 'Preview'}
            </button>
            <button
              onClick={handleCancel}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {[
            { id: 'layout', label: 'Layout', icon: 'fas fa-th-large' },
            { id: 'widgets', label: 'Widgets', icon: 'fas fa-puzzle-piece' },
            { id: 'themes', label: 'Themes', icon: 'fas fa-palette' },
            { id: 'settings', label: 'Settings', icon: 'fas fa-cog' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-6 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <i className={tab.icon}></i>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          {!previewMode && (
            <div className="w-80 border-r border-gray-200 bg-gray-50 overflow-y-auto">
              {activeTab === 'layout' && (
                <div className="p-4 space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Layout Settings</h3>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Layout Name
                        </label>
                        <input
                          type="text"
                          value={currentLayout.name}
                          onChange={(e) => updateLayoutSettings({ name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Grid Columns: {currentLayout.gridColumns}
                        </label>
                        <input
                          type="range"
                          min="2"
                          max="6"
                          value={currentLayout.gridColumns}
                          onChange={(e) => updateLayoutSettings({ gridColumns: parseInt(e.target.value) })}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Layout Actions</h3>
                    <div className="space-y-2">
                      <button
                        onClick={createNewLayout}
                        className="w-full px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm"
                      >
                        <i className="fas fa-plus mr-2"></i>
                        New Layout
                      </button>
                      <button
                        onClick={duplicateLayout}
                        className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                      >
                        <i className="fas fa-copy mr-2"></i>
                        Duplicate Layout
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'widgets' && (
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Available Widgets</h3>
                  <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="available-widgets">
                      {(provided) => (
                        <div
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          className="space-y-2"
                        >
                          {availableWidgets.map((widget, index) => (
                            <Draggable
                              key={widget.id}
                              draggableId={widget.id}
                              index={index}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`p-3 bg-white border border-gray-200 rounded-lg cursor-move transition-shadow ${
                                    snapshot.isDragging ? 'shadow-lg' : 'hover:shadow-md'
                                  }`}
                                >
                                  <div className="flex items-center space-x-3">
                                    <i className={`${widget.icon} text-primary`}></i>
                                    <div className="flex-1">
                                      <h4 className="font-medium text-gray-900 text-sm">
                                        {widget.name}
                                      </h4>
                                      <p className="text-xs text-gray-600">
                                        {widget.description}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                </div>
              )}

              {activeTab === 'themes' && (
                <div className="p-4 space-y-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Choose Theme</h3>
                  <div className="space-y-3">
                    {availableThemes.map(theme => (
                      <div
                        key={theme.id}
                        onClick={() => updateTheme(theme.id)}
                        className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                          preferences.currentTheme === theme.id
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900">{theme.name}</h4>
                          {preferences.currentTheme === theme.id && (
                            <i className="fas fa-check text-primary"></i>
                          )}
                        </div>
                        <div className="flex space-x-1 mb-2">
                          {Object.entries(theme.colors).slice(0, 4).map(([key, color]) => (
                            <div
                              key={key}
                              className="w-4 h-4 rounded-full border border-gray-300"
                              style={{ backgroundColor: color }}
                            ></div>
                          ))}
                        </div>
                        <div className="text-xs text-gray-600">
                          {theme.spacing} spacing • {theme.borderRadius} corners
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="p-4 space-y-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Dashboard Settings</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Auto Save</label>
                        <p className="text-xs text-gray-500">Automatically save changes</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preferences.autoSave}
                          onChange={(e) => dashboardCustomizationService.updatePreference(
                            userId, 'autoSave', e.target.checked
                          )}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Show Widget Titles</label>
                        <p className="text-xs text-gray-500">Display titles on widgets</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preferences.showWidgetTitles}
                          onChange={(e) => dashboardCustomizationService.updatePreference(
                            userId, 'showWidgetTitles', e.target.checked
                          )}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Enable Animations</label>
                        <p className="text-xs text-gray-500">Smooth transitions and effects</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preferences.enableAnimations}
                          onChange={(e) => dashboardCustomizationService.updatePreference(
                            userId, 'enableAnimations', e.target.checked
                          )}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Refresh Interval: {Math.floor(preferences.refreshInterval / 60)} minutes
                      </label>
                      <input
                        type="range"
                        min="60"
                        max="1800"
                        step="60"
                        value={preferences.refreshInterval}
                        onChange={(e) => dashboardCustomizationService.updatePreference(
                          userId, 'refreshInterval', parseInt(e.target.value)
                        )}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>1 min</span>
                        <span>30 min</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {previewMode ? 'Preview Mode' : 'Layout Editor'}
              </h3>
              {!previewMode && (
                <div className="text-sm text-gray-600">
                  Drag widgets from the sidebar to add them to your dashboard
                </div>
              )}
            </div>

            {/* Dashboard Grid */}
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="dashboard-grid">
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={`grid gap-4 min-h-96 p-4 border-2 border-dashed rounded-lg transition-colors ${
                      snapshot.isDraggingOver
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-300'
                    }`}
                    style={{
                      gridTemplateColumns: `repeat(${currentLayout.gridColumns}, 1fr)`
                    }}
                  >
                    {currentLayout.widgets.map((widget, index) => (
                      <Draggable
                        key={widget.id}
                        draggableId={widget.id}
                        index={index}
                        isDragDisabled={previewMode}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`bg-white border border-gray-200 rounded-lg p-4 transition-shadow ${
                              snapshot.isDragging ? 'shadow-lg' : 'hover:shadow-md'
                            } ${!widget.enabled ? 'opacity-50' : ''}`}
                            style={{
                              gridColumn: `span ${widget.position.width}`,
                              gridRow: `span ${widget.position.height}`,
                              ...provided.draggableProps.style
                            }}
                          >
                            {!previewMode && (
                              <div className="flex items-center justify-between mb-2">
                                <div
                                  {...provided.dragHandleProps}
                                  className="flex items-center space-x-2 cursor-move"
                                >
                                  <i className="fas fa-grip-vertical text-gray-400"></i>
                                  <span className="font-medium text-gray-900 text-sm">
                                    {widget.title}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <button
                                    onClick={() => toggleWidget(widget.id)}
                                    className={`p-1 rounded transition-colors ${
                                      widget.enabled
                                        ? 'text-green-600 hover:text-green-800'
                                        : 'text-gray-400 hover:text-gray-600'
                                    }`}
                                    title={widget.enabled ? 'Hide widget' : 'Show widget'}
                                  >
                                    <i className={`fas ${widget.enabled ? 'fa-eye' : 'fa-eye-slash'}`}></i>
                                  </button>
                                  <button
                                    onClick={() => removeWidget(widget.id)}
                                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                    title="Remove widget"
                                  >
                                    <i className="fas fa-trash"></i>
                                  </button>
                                </div>
                              </div>
                            )}
                            
                            <div className="text-center py-8 text-gray-500">
                              <i className={`${availableWidgets.find(w => w.component === widget.component)?.icon || 'fas fa-puzzle-piece'} text-2xl mb-2`}></i>
                              <p className="text-sm">{widget.component}</p>
                              {previewMode && preferences.showWidgetTitles && (
                                <p className="text-xs font-medium mt-1">{widget.title}</p>
                              )}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-4">
            {hasChanges && (
              <span className="text-sm text-amber-600 flex items-center">
                <i className="fas fa-exclamation-triangle mr-2"></i>
                You have unsaved changes
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => dashboardCustomizationService.resetToDefaults(userId)}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Reset to Default
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}