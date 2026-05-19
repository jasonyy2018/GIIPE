'use client';

import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Bell,
  Settings,
  Plus,
  Filter,
  RefreshCw,
  Eye,
  EyeOff,
  MessageSquare,
  Users,
  Mail,
  Smartphone,
  Webhook,
  Trash2,
  Edit
} from 'lucide-react';

interface SecurityAlert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  source: string;
  ipAddress?: string;
  userId?: string;
  metadata?: any;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  resolutionNote?: string;
  escalated: boolean;
  escalatedAt?: string;
  escalationLevel: number;
  responseTime?: number;
  createdAt: string;
  updatedAt: string;
}

interface AlertRule {
  id: string;
  name: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  conditions: any;
  enabled: boolean;
  escalationRules: EscalationRule[];
  notificationChannels: string[];
}

interface EscalationRule {
  level: number;
  timeoutMinutes: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  notificationChannels: string[];
  recipients: string[];
}

interface NotificationChannel {
  id: string;
  type: 'email' | 'sms' | 'webhook' | 'in-app';
  name: string;
  config: any;
  enabled: boolean;
}

interface AlertMetrics {
  totalAlerts: number;
  alertsBySeverity: Record<string, number>;
  averageResponseTime: number;
  escalationRate: number;
  resolutionRate: number;
  alertsByType: Record<string, number>;
}

const SecurityAlertSystem: React.FC = () => {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [notificationChannels, setNotificationChannels] = useState<NotificationChannel[]>([]);
  const [metrics, setMetrics] = useState<AlertMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'alerts' | 'rules' | 'channels' | 'metrics'>('alerts');
  
  // Alert filters
  const [alertFilters, setAlertFilters] = useState({
    severity: '',
    acknowledged: 'all',
    resolved: 'all',
    escalated: 'all',
    type: ''
  });

  // Modal states
  const [showCreateAlert, setShowCreateAlert] = useState(false);
  const [showCreateRule, setShowCreateRule] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<SecurityAlert | null>(null);
  const [showAlertDetails, setShowAlertDetails] = useState(false);

  // Form states
  const [createAlertForm, setCreateAlertForm] = useState({
    type: '',
    severity: 'medium' as const,
    title: '',
    description: '',
    source: 'manual',
    ipAddress: '',
    userId: ''
  });

  const [acknowledgeForm, setAcknowledgeForm] = useState({
    note: ''
  });

  const [resolveForm, setResolveForm] = useState({
    resolutionNote: ''
  });

  useEffect(() => {
    loadSecurityAlerts();
    loadAlertRules();
    loadNotificationChannels();
    loadAlertMetrics();
    
    // Set up real-time updates
    const interval = setInterval(() => {
      loadSecurityAlerts();
      loadAlertMetrics();
    }, 30000);

    return () => clearInterval(interval);
  }, [alertFilters]);

  const loadSecurityAlerts = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const params = new URLSearchParams();
      if (alertFilters.severity) params.append('severity', alertFilters.severity);
      if (alertFilters.acknowledged !== 'all') params.append('acknowledged', alertFilters.acknowledged);
      if (alertFilters.resolved !== 'all') params.append('resolved', alertFilters.resolved);
      if (alertFilters.escalated !== 'all') params.append('escalated', alertFilters.escalated);
      if (alertFilters.type) params.append('type', alertFilters.type);

      const response = await fetch(`/api/admin/security/alerts?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAlerts(data.alerts || []);
      }
    } catch (error) {
      console.error('Error loading security alerts:', error);
    }
  };

  const loadAlertRules = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/admin/security/alert-rules', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAlertRules(data || []);
      }
    } catch (error) {
      console.error('Error loading alert rules:', error);
    }
  };

  const loadNotificationChannels = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/admin/security/notification-channels', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setNotificationChannels(data || []);
      }
    } catch (error) {
      console.error('Error loading notification channels:', error);
    }
  };

  const loadAlertMetrics = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/admin/security/alerts/metrics', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading alert metrics:', error);
      setLoading(false);
    }
  };

  const createAlert = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/admin/security/alerts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createAlertForm),
      });

      if (response.ok) {
        setShowCreateAlert(false);
        setCreateAlertForm({
          type: '',
          severity: 'medium',
          title: '',
          description: '',
          source: 'manual',
          ipAddress: '',
          userId: ''
        });
        loadSecurityAlerts();
      }
    } catch (error) {
      console.error('Error creating alert:', error);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/admin/security/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(acknowledgeForm),
      });

      if (response.ok) {
        loadSecurityAlerts();
        setAcknowledgeForm({ note: '' });
      }
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/admin/security/alerts/${alertId}/resolve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(resolveForm),
      });

      if (response.ok) {
        loadSecurityAlerts();
        setResolveForm({ resolutionNote: '' });
        setSelectedAlert(null);
        setShowAlertDetails(false);
      }
    } catch (error) {
      console.error('Error resolving alert:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'high': return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'medium': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'low': return <Shield className="h-4 w-4 text-green-600" />;
      default: return <Shield className="h-4 w-4 text-gray-600" />;
    }
  };

  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'sms': return <Smartphone className="h-4 w-4" />;
      case 'webhook': return <Webhook className="h-4 w-4" />;
      case 'in-app': return <Bell className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-gray-600">Loading security alert system...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Shield className="h-8 w-8 text-primary mr-3" />
            Security Alert System
          </h1>
          <p className="text-gray-600 mt-1">
            Real-time security alert management and notification system
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowCreateAlert(true)}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Alert
          </button>
          <button
            onClick={loadSecurityAlerts}
            className="flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Alerts</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.totalAlerts}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-primary" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Critical</p>
                <p className="text-2xl font-bold text-red-600">{metrics.alertsBySeverity.critical || 0}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">High</p>
                <p className="text-2xl font-bold text-orange-600">{metrics.alertsBySeverity.high || 0}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Response</p>
                <p className="text-2xl font-bold text-primary">{Math.round(metrics.averageResponseTime)}s</p>
              </div>
              <Clock className="h-8 w-8 text-primary" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Escalation Rate</p>
                <p className="text-2xl font-bold text-yellow-600">{Math.round(metrics.escalationRate)}%</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Resolution Rate</p>
                <p className="text-2xl font-bold text-green-600">{Math.round(metrics.resolutionRate)}%</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'alerts', label: 'Active Alerts', icon: AlertTriangle },
            { id: 'rules', label: 'Alert Rules', icon: Settings },
            { id: 'channels', label: 'Notification Channels', icon: Bell },
            { id: 'metrics', label: 'Metrics & Analytics', icon: Shield },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'alerts' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex items-center space-x-4">
                <Filter className="h-5 w-5 text-gray-400" />
                <select
                  value={alertFilters.severity}
                  onChange={(e) => setAlertFilters(prev => ({ ...prev, severity: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">All Severities</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
                <select
                  value={alertFilters.acknowledged}
                  onChange={(e) => setAlertFilters(prev => ({ ...prev, acknowledged: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="all">All Alerts</option>
                  <option value="false">Unacknowledged</option>
                  <option value="true">Acknowledged</option>
                </select>
                <select
                  value={alertFilters.resolved}
                  onChange={(e) => setAlertFilters(prev => ({ ...prev, resolved: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="false">Active</option>
                  <option value="true">Resolved</option>
                </select>
              </div>
            </div>

            {/* Alerts List */}
            <div className="space-y-4">
              {alerts.map((alert) => (
                <div key={alert.id} className={`border rounded-lg p-4 ${getSeverityColor(alert.severity)}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        {getSeverityIcon(alert.severity)}
                        <span className="font-medium text-gray-900">{alert.title}</span>
                        <span className="text-sm text-gray-600">({alert.type})</span>
                        {alert.acknowledged && (
                          <span className="px-2 py-1 bg-light text-primary-dark rounded-full text-xs font-medium">
                            ACKNOWLEDGED
                          </span>
                        )}
                        {alert.resolved && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                            RESOLVED
                          </span>
                        )}
                        {alert.escalated && (
                          <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                            ESCALATED (L{alert.escalationLevel})
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{alert.description}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>Source: {alert.source}</span>
                        {alert.ipAddress && <span>IP: {alert.ipAddress}</span>}
                        {alert.responseTime && <span>Response: {alert.responseTime}s</span>}
                        <span>{new Date(alert.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setSelectedAlert(alert);
                          setShowAlertDetails(true);
                        }}
                        className="px-3 py-1 bg-primary text-white text-sm rounded hover:bg-primary-dark"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {!alert.acknowledged && (
                        <button
                          onClick={() => acknowledgeAlert(alert.id)}
                          className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
                        >
                          Acknowledge
                        </button>
                      )}
                      {alert.acknowledged && !alert.resolved && (
                        <button
                          onClick={() => {
                            setSelectedAlert(alert);
                            setShowAlertDetails(true);
                          }}
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'rules' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Alert Rules</h3>
              <button
                onClick={() => setShowCreateRule(true)}
                className="flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Rule
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {alertRules.map((rule) => (
                <div key={rule.id} className="bg-white border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-medium text-gray-900">{rule.name}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(rule.severity)}`}>
                          {rule.severity.toUpperCase()}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          rule.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {rule.enabled ? 'ENABLED' : 'DISABLED'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">Type: {rule.type}</p>
                      <div className="text-xs text-gray-500">
                        <span>Escalation Levels: {rule.escalationRules.length}</span>
                        <span className="ml-4">Channels: {rule.notificationChannels.length}</span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button className="p-2 text-gray-400 hover:text-primary">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'channels' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Notification Channels</h3>
              <button
                onClick={() => setShowCreateChannel(true)}
                className="flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Channel
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {notificationChannels.map((channel) => (
                <div key={channel.id} className="bg-white border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      {getChannelIcon(channel.type)}
                      <div>
                        <h4 className="font-medium text-gray-900">{channel.name}</h4>
                        <p className="text-sm text-gray-600 capitalize">{channel.type}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      channel.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {channel.enabled ? 'ENABLED' : 'DISABLED'}
                    </span>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button className="p-2 text-gray-400 hover:text-primary">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'metrics' && metrics && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Alerts by Severity</h3>
                <div className="space-y-3">
                  {Object.entries(metrics.alertsBySeverity).map(([severity, count]) => (
                    <div key={severity} className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        {getSeverityIcon(severity)}
                        <span className="capitalize">{severity}</span>
                      </div>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Alerts by Type</h3>
                <div className="space-y-3">
                  {Object.entries(metrics.alertsByType).map(([type, count]) => (
                    <div key={type} className="flex justify-between items-center">
                      <span className="capitalize">{type.replace('_', ' ')}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
                <Clock className="h-12 w-12 text-primary mx-auto mb-3" />
                <p className="text-2xl font-bold text-gray-900">{Math.round(metrics.averageResponseTime)}s</p>
                <p className="text-sm text-gray-600">Average Response Time</p>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
                <AlertTriangle className="h-12 w-12 text-yellow-600 mx-auto mb-3" />
                <p className="text-2xl font-bold text-gray-900">{Math.round(metrics.escalationRate)}%</p>
                <p className="text-sm text-gray-600">Escalation Rate</p>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
                <p className="text-2xl font-bold text-gray-900">{Math.round(metrics.resolutionRate)}%</p>
                <p className="text-sm text-gray-600">Resolution Rate</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Alert Modal */}
      {showCreateAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Create Security Alert</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alert Type</label>
                <input
                  type="text"
                  value={createAlertForm.type}
                  onChange={(e) => setCreateAlertForm(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g., failed_login, suspicious_activity"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                <select
                  value={createAlertForm.severity}
                  onChange={(e) => setCreateAlertForm(prev => ({ ...prev, severity: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={createAlertForm.title}
                  onChange={(e) => setCreateAlertForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Alert title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={createAlertForm.description}
                  onChange={(e) => setCreateAlertForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                  placeholder="Alert description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">IP Address (optional)</label>
                <input
                  type="text"
                  value={createAlertForm.ipAddress}
                  onChange={(e) => setCreateAlertForm(prev => ({ ...prev, ipAddress: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="192.168.1.1"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCreateAlert(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={createAlert}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Create Alert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Details Modal */}
      {showAlertDetails && selectedAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Alert Details</h3>
              <button
                onClick={() => setShowAlertDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Alert ID</label>
                  <p className="text-sm text-gray-900">{selectedAlert.id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Type</label>
                  <p className="text-sm text-gray-900">{selectedAlert.type}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Severity</label>
                  <div className="flex items-center space-x-2">
                    {getSeverityIcon(selectedAlert.severity)}
                    <span className="capitalize">{selectedAlert.severity}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Source</label>
                  <p className="text-sm text-gray-900">{selectedAlert.source}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <p className="text-sm text-gray-900">{selectedAlert.description}</p>
              </div>

              {selectedAlert.acknowledged && !selectedAlert.resolved && (
                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-900 mb-2">Resolve Alert</h4>
                  <textarea
                    value={resolveForm.resolutionNote}
                    onChange={(e) => setResolveForm({ resolutionNote: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={3}
                    placeholder="Resolution note..."
                  />
                  <div className="flex justify-end mt-3">
                    <button
                      onClick={() => resolveAlert(selectedAlert.id)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Resolve Alert
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityAlertSystem;