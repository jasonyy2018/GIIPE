'use client';

import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  AlertTriangle, 
  Ban, 
  Activity, 
  Eye, 
  Clock,
  MapPin,
  User,
  FileText,
  RefreshCw
} from 'lucide-react';

interface SecurityMetrics {
  activeThreats: number;
  failedLogins24h: number;
  blockedIPs: number;
  criticalEvents: number;
  securityScore: number;
  lastUpdated: string;
}

interface SecurityEvent {
  id: string;
  eventType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  ipAddress?: string;
  userId?: string;
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  resolved: boolean;
  createdAt: string;
}

interface FailedLoginAnalysis {
  summary: {
    totalFailedLogins24h: number;
    totalFailedLogins7d: number;
  };
  topFailedIPs: Array<{
    ipAddress: string;
    attempts: number;
  }>;
  failedLoginsByHour: Array<{
    hour: string;
    count: number;
  }>;
}

interface SuspiciousActivity {
  suspiciousIPs: Array<{
    ipAddress: string;
    eventCount: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  }>;
  suspiciousUsers: Array<{
    userId: string;
    eventCount: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  }>;
  behavioralPatterns: {
    rapidSuccessiveAttempts: any[];
    unusualAccessTimes: any[];
  };
}

interface BlockedIP {
  id: string;
  ipAddress: string;
  reason: string;
  isActive: boolean;
  expiresAt?: string;
  createdAt: string;
}

const SecurityMonitoringDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [failedLoginAnalysis, setFailedLoginAnalysis] = useState<FailedLoginAnalysis | null>(null);
  const [suspiciousActivity, setSuspiciousActivity] = useState<SuspiciousActivity | null>(null);
  const [blockedIPs, setBlockedIPs] = useState<BlockedIP[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'failed-logins' | 'suspicious' | 'blocked-ips' | 'compliance'>('overview');
  const [eventFilters, setEventFilters] = useState({
    eventType: '',
    severity: '',
    resolved: 'all'
  });
  const [showBlockIPModal, setShowBlockIPModal] = useState(false);
  const [blockIPForm, setBlockIPForm] = useState({
    ipAddress: '',
    reason: '',
    durationHours: 24
  });

  useEffect(() => {
    loadSecurityData();
    const interval = setInterval(loadSecurityData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadSecurityData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      // Load dashboard metrics
      const metricsResponse = await fetch('/api/admin/security/dashboard', { headers });
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        setMetrics(metricsData);
      }

      // Load recent security events
      const eventsResponse = await fetch('/api/admin/security/events?limit=20', { headers });
      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json();
        setEvents(eventsData.events || []);
      }

      // Load failed login analysis
      const failedLoginsResponse = await fetch('/api/admin/security/failed-logins/analysis', { headers });
      if (failedLoginsResponse.ok) {
        const failedLoginsData = await failedLoginsResponse.json();
        setFailedLoginAnalysis(failedLoginsData);
      }

      // Load blocked IPs
      const blockedIPsResponse = await fetch('/api/admin/security/blocked-ips?limit=10', { headers });
      if (blockedIPsResponse.ok) {
        const blockedIPsData = await blockedIPsResponse.json();
        setBlockedIPs(blockedIPsData.blockedIPs || []);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading security data:', error);
      setLoading(false);
    }
  };

  const analyzeSuspiciousActivity = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/admin/security/suspicious-activity', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          periodDays: 7,
          threshold: 5,
          includeBehavioralPatterns: true
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuspiciousActivity(data);
      }
    } catch (error) {
      console.error('Error analyzing suspicious activity:', error);
    }
  };

  const resolveSecurityEvent = async (eventId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/admin/security/events/${eventId}/resolve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        loadSecurityData();
      }
    } catch (error) {
      console.error('Error resolving security event:', error);
    }
  };

  const blockIP = async (ipAddress: string, reason: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/admin/security/blocked-ips', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ipAddress,
          reason,
          durationHours: 24
        }),
      });

      if (response.ok) {
        loadSecurityData();
      }
    } catch (error) {
      console.error('Error blocking IP:', error);
    }
  };

  const unblockIP = async (ipAddress: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/admin/security/blocked-ips/${ipAddress}/unblock`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        loadSecurityData();
      }
    } catch (error) {
      console.error('Error unblocking IP:', error);
    }
  };

  const handleBlockIP = async () => {
    if (!blockIPForm.ipAddress || !blockIPForm.reason) return;

    await blockIP(blockIPForm.ipAddress, blockIPForm.reason);
    setShowBlockIPModal(false);
    setBlockIPForm({ ipAddress: '', reason: '', durationHours: 24 });
  };

  const generateComplianceReport = async (reportType: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/admin/security/compliance', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportType,
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
          includeDetails: true
        }),
      });

      if (response.ok) {
        const report = await response.json();
        console.log('Compliance report generated:', report);
        // TODO: Handle report display or download
      }
    } catch (error) {
      console.error('Error generating compliance report:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getSecurityScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-gray-600">Loading security monitoring data...</span>
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
            Security Monitoring Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Real-time security monitoring and threat detection
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={loadSecurityData}
            className="flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
          <button
            onClick={analyzeSuspiciousActivity}
            className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            <Eye className="h-4 w-4 mr-2" />
            Analyze Threats
          </button>
        </div>
      </div>

      {/* Security Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Security Score</p>
                <p className={`text-3xl font-bold ${getSecurityScoreColor(metrics.securityScore)}`}>
                  {metrics.securityScore}%
                </p>
              </div>
              <Shield className={`h-8 w-8 ${getSecurityScoreColor(metrics.securityScore)}`} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Threats</p>
                <p className="text-3xl font-bold text-red-600">{metrics.activeThreats}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Failed Logins (24h)</p>
                <p className="text-3xl font-bold text-orange-600">{metrics.failedLogins24h}</p>
              </div>
              <Ban className="h-8 w-8 text-orange-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Blocked IPs</p>
                <p className="text-3xl font-bold text-primary">{metrics.blockedIPs}</p>
              </div>
              <MapPin className="h-8 w-8 text-primary" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Critical Events</p>
                <p className="text-3xl font-bold text-purple-600">{metrics.criticalEvents}</p>
              </div>
              <Activity className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'events', label: 'Security Events', icon: AlertTriangle },
            { id: 'failed-logins', label: 'Failed Logins', icon: Ban },
            { id: 'suspicious', label: 'Suspicious Activity', icon: Eye },
            { id: 'blocked-ips', label: 'Blocked IPs', icon: MapPin },
            { id: 'compliance', label: 'Compliance', icon: FileText },
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
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Security Events */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Recent Security Events</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {events.slice(0, 5).map((event) => (
                    <div key={event.id} className="flex items-start space-x-3">
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(event.severity)}`}>
                        {event.severity.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{event.eventType}</p>
                        <p className="text-sm text-gray-600 truncate">{event.description}</p>
                        <div className="flex items-center space-x-4 mt-1">
                          {event.ipAddress && (
                            <span className="text-xs text-gray-500 flex items-center">
                              <MapPin className="h-3 w-3 mr-1" />
                              {event.ipAddress}
                            </span>
                          )}
                          <span className="text-xs text-gray-500 flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {new Date(event.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Failed Login Analysis */}
            {failedLoginAnalysis && (
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Failed Login Analysis</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-red-600">
                          {failedLoginAnalysis.summary.totalFailedLogins24h}
                        </p>
                        <p className="text-sm text-gray-600">Last 24 Hours</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-orange-600">
                          {failedLoginAnalysis.summary.totalFailedLogins7d}
                        </p>
                        <p className="text-sm text-gray-600">Last 7 Days</p>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Top Failed IPs</h4>
                      <div className="space-y-2">
                        {failedLoginAnalysis.topFailedIPs.slice(0, 3).map((ip, index) => (
                          <div key={index} className="flex justify-between items-center">
                            <span className="text-sm text-gray-900">{ip.ipAddress}</span>
                            <span className="text-sm font-medium text-red-600">{ip.attempts} attempts</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'events' && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Security Events</h3>
                <div className="flex space-x-3">
                  <select
                    value={eventFilters.severity}
                    onChange={(e) => setEventFilters(prev => ({ ...prev, severity: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="">All Severities</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                  <select
                    value={eventFilters.resolved}
                    onChange={(e) => setEventFilters(prev => ({ ...prev, resolved: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="all">All Events</option>
                    <option value="false">Unresolved</option>
                    <option value="true">Resolved</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {events.map((event) => (
                  <div key={event.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(event.severity)}`}>
                            {event.severity.toUpperCase()}
                          </span>
                          <span className="text-sm font-medium text-gray-900">{event.eventType}</span>
                          {event.resolved && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                              RESOLVED
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{event.description}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          {event.ipAddress && (
                            <span className="flex items-center">
                              <MapPin className="h-3 w-3 mr-1" />
                              {event.ipAddress}
                            </span>
                          )}
                          {event.user && (
                            <span className="flex items-center">
                              <User className="h-3 w-3 mr-1" />
                              {event.user.email}
                            </span>
                          )}
                          <span className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {new Date(event.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      {!event.resolved && (
                        <button
                          onClick={() => resolveSecurityEvent(event.id)}
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'failed-logins' && failedLoginAnalysis && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Failed Login Summary</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-red-600">
                      {failedLoginAnalysis.summary.totalFailedLogins24h}
                    </p>
                    <p className="text-sm text-gray-600">Last 24 Hours</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-orange-600">
                      {failedLoginAnalysis.summary.totalFailedLogins7d}
                    </p>
                    <p className="text-sm text-gray-600">Last 7 Days</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Top Failed IPs</h3>
                <div className="space-y-3">
                  {failedLoginAnalysis.topFailedIPs.map((ip, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span className="text-sm font-medium text-gray-900">{ip.ipAddress}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-red-600">{ip.attempts} attempts</span>
                        <button
                          onClick={() => blockIP(ip.ipAddress, `High failed login attempts: ${ip.attempts}`)}
                          className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                        >
                          Block
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'suspicious' && suspiciousActivity && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Suspicious IPs</h3>
                <div className="space-y-3">
                  {suspiciousActivity.suspiciousIPs.map((ip, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <div>
                        <span className="text-sm font-medium text-gray-900">{ip.ipAddress}</span>
                        <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getRiskLevelColor(ip.riskLevel)}`}>
                          {ip.riskLevel.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">{ip.eventCount} events</span>
                        <button
                          onClick={() => blockIP(ip.ipAddress, `Suspicious activity detected: ${ip.eventCount} events`)}
                          className="px-2 py-1 bg-orange-600 text-white text-xs rounded hover:bg-orange-700"
                        >
                          Block
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Suspicious Users</h3>
                <div className="space-y-3">
                  {suspiciousActivity.suspiciousUsers.map((user, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <div>
                        <span className="text-sm font-medium text-gray-900">{user.userId}</span>
                        <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getRiskLevelColor(user.riskLevel)}`}>
                          {user.riskLevel.toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm text-gray-600">{user.eventCount} events</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {suspiciousActivity.behavioralPatterns && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Rapid Successive Attempts</h3>
                  <div className="space-y-3">
                    {suspiciousActivity.behavioralPatterns.rapidSuccessiveAttempts?.slice(0, 5).map((pattern: any, index: number) => (
                      <div key={index} className="p-3 bg-red-50 rounded">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-900">
                            {pattern.ipAddress || pattern.userId}
                          </span>
                          <span className="text-sm text-red-600">
                            {pattern.attempt_count} attempts in {Math.round(pattern.duration_seconds)}s
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Unusual Access Times</h3>
                  <div className="space-y-3">
                    {suspiciousActivity.behavioralPatterns.unusualAccessTimes?.slice(0, 5).map((pattern: any, index: number) => (
                      <div key={index} className="p-3 bg-yellow-50 rounded">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-900">
                            {pattern.ipAddress || pattern.userId}
                          </span>
                          <span className="text-sm text-yellow-600">
                            {pattern.event_count} events outside hours
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'blocked-ips' && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Blocked IP Addresses</h3>
                <button
                  onClick={() => setShowBlockIPModal(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Block IP
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {blockedIPs.map((blockedIP) => (
                  <div key={blockedIP.id} className="flex justify-between items-center p-4 border border-gray-200 rounded-lg">
                    <div>
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium text-gray-900">{blockedIP.ipAddress}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          blockedIP.isActive ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {blockedIP.isActive ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{blockedIP.reason}</p>
                      <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                        <span>Blocked: {new Date(blockedIP.createdAt).toLocaleString()}</span>
                        {blockedIP.expiresAt && (
                          <span>Expires: {new Date(blockedIP.expiresAt).toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                    {blockedIP.isActive && (
                      <button
                        onClick={() => unblockIP(blockedIP.ipAddress)}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                      >
                        Unblock
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'compliance' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Security Compliance Reports</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {['gdpr', 'hipaa', 'sox', 'pci'].map((reportType) => (
                  <button
                    key={reportType}
                    onClick={() => generateComplianceReport(reportType)}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center"
                  >
                    <FileText className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <p className="text-sm font-medium text-gray-900">{reportType.toUpperCase()}</p>
                    <p className="text-xs text-gray-600">Generate Report</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Block IP Modal */}
      {showBlockIPModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Block IP Address</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">IP Address</label>
                <input
                  type="text"
                  value={blockIPForm.ipAddress}
                  onChange={(e) => setBlockIPForm(prev => ({ ...prev, ipAddress: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="192.168.1.1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <textarea
                  value={blockIPForm.reason}
                  onChange={(e) => setBlockIPForm(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                  placeholder="Reason for blocking this IP address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration (hours)</label>
                <input
                  type="number"
                  value={blockIPForm.durationHours}
                  onChange={(e) => setBlockIPForm(prev => ({ ...prev, durationHours: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="24"
                />
                <p className="text-xs text-gray-500 mt-1">Set to 0 for permanent block</p>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowBlockIPModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBlockIP}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Block IP
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityMonitoringDashboard;