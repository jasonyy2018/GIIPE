'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface FAQItem {
  id: number;
  question: string;
  answer: string;
  category: string;
}

interface SupportTicket {
  id: number;
  subject: string;
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  lastUpdate: string;
}

export default function HelpPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('faq');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  
  // Support ticket form
  const [ticketForm, setTicketForm] = useState({
    subject: '',
    category: 'general',
    priority: 'medium',
    description: ''
  });

  const [faqs] = useState<FAQItem[]>([
    {
      id: 1,
      question: 'How do I register for an event?',
      answer: 'To register for an event, navigate to the Events page, find the event you\'re interested in, and click the "Register" button. You\'ll need to fill out the registration form and may need to pay a fee depending on the event.',
      category: 'events'
    },
    {
      id: 2,
      question: 'How can I update my profile information?',
      answer: 'Go to your Profile page by clicking on your avatar or navigating to the Profile section. Click the "Edit Profile" button to modify your personal and professional information.',
      category: 'account'
    },
    {
      id: 3,
      question: 'How do I bookmark articles or events?',
      answer: 'You can bookmark content by clicking the bookmark icon on any article or event. Your bookmarks will be saved to your Bookmarks page for easy access later.',
      category: 'features'
    },
    {
      id: 4,
      question: 'Can I change my notification settings?',
      answer: 'Yes, you can customize your notification preferences in the Settings page. You can choose which types of notifications to receive and how you want to receive them (email, SMS, push notifications).',
      category: 'notifications'
    },
    {
      id: 5,
      question: 'How do I reset my password?',
      answer: 'If you\'ve forgotten your password, click the "Forgot Password" link on the login page. Enter your email address and we\'ll send you instructions to reset your password.',
      category: 'account'
    },
    {
      id: 6,
      question: 'What types of events are available on the platform?',
      answer: 'Our platform hosts various types of events including conferences, workshops, webinars, networking sessions, and academic symposiums focused on innovation and intellectual property.',
      category: 'events'
    },
    {
      id: 7,
      question: 'How can I connect with other users?',
      answer: 'You can connect with other users by visiting their profiles and sending a connection request. You can also message users directly through the Messages feature.',
      category: 'networking'
    },
    {
      id: 8,
      question: 'Is my personal information secure?',
      answer: 'Yes, we take data security seriously. All personal information is encrypted and stored securely. You can control your privacy settings in the Settings page to manage what information is visible to other users.',
      category: 'privacy'
    }
  ]);

  const [supportTickets] = useState<SupportTicket[]>([
    {
      id: 1,
      subject: 'Unable to register for conference',
      status: 'in-progress',
      priority: 'high',
      createdAt: '2024-05-20T10:00:00Z',
      lastUpdate: '2024-05-21T14:30:00Z'
    },
    {
      id: 2,
      subject: 'Profile picture not uploading',
      status: 'resolved',
      priority: 'medium',
      createdAt: '2024-05-18T09:15:00Z',
      lastUpdate: '2024-05-19T11:45:00Z'
    }
  ]);

  useEffect(() => {
    // Check authentication
    const checkAuth = () => {
      if (typeof window !== 'undefined') {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
          router.push('/login');
          return;
        }
      }
      
      setLoading(false);
    };

    checkAuth();
  }, [router]);

  const categories = [
    { id: 'all', label: 'All Categories' },
    { id: 'account', label: 'Account & Profile' },
    { id: 'events', label: 'Events & Registration' },
    { id: 'features', label: 'Platform Features' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'networking', label: 'Networking' },
    { id: 'privacy', label: 'Privacy & Security' }
  ];

  const filteredFAQs = faqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Here you would submit the ticket to the backend
    console.log('Submitting support ticket:', ticketForm);
    alert('Support ticket submitted successfully! We\'ll get back to you soon.');
    setTicketForm({
      subject: '',
      category: 'general',
      priority: 'medium',
      description: ''
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-light text-primary-dark';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <button
                onClick={() => router.back()}
                className="mr-4 text-gray-600 hover:text-primary transition-colors"
              >
                <i className="fas fa-arrow-left text-xl"></i>
              </button>
              <h1 className="text-2xl font-bold text-primary-dark">Help & Support</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-primary hover:text-primary-dark font-medium"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm p-6 text-center hover:shadow-lg transition-shadow cursor-pointer">
              <div className="w-12 h-12 mx-auto mb-4 bg-light rounded-full flex items-center justify-center">
                <i className="fas fa-question-circle text-2xl text-primary"></i>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Browse FAQ</h3>
              <p className="text-gray-600 text-sm">Find answers to commonly asked questions</p>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6 text-center hover:shadow-lg transition-shadow cursor-pointer">
              <div className="w-12 h-12 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                <i className="fas fa-ticket-alt text-2xl text-green-600"></i>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Submit Ticket</h3>
              <p className="text-gray-600 text-sm">Get personalized help from our support team</p>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6 text-center hover:shadow-lg transition-shadow cursor-pointer">
              <div className="w-12 h-12 mx-auto mb-4 bg-purple-100 rounded-full flex items-center justify-center">
                <i className="fas fa-book text-2xl text-purple-600"></i>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">User Guide</h3>
              <p className="text-gray-600 text-sm">Learn how to use all platform features</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                {[
                  { id: 'faq', label: 'FAQ', icon: 'fas fa-question-circle' },
                  { id: 'tickets', label: 'My Tickets', icon: 'fas fa-ticket-alt' },
                  { id: 'contact', label: 'Contact Support', icon: 'fas fa-envelope' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <i className={`${tab.icon} mr-2`}></i>
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              {/* FAQ Tab */}
              {activeTab === 'faq' && (
                <div>
                  {/* Search and Filter */}
                  <div className="mb-6">
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          placeholder="Search FAQ..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                        />
                        <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                      </div>
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                      >
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* FAQ List */}
                  <div className="space-y-4">
                    {filteredFAQs.map((faq) => (
                      <div key={faq.id} className="border border-gray-200 rounded-lg">
                        <button
                          onClick={() => setExpandedFAQ(expandedFAQ === faq.id ? null : faq.id)}
                          className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                        >
                          <h3 className="font-medium text-gray-900">{faq.question}</h3>
                          <i className={`fas fa-chevron-${expandedFAQ === faq.id ? 'up' : 'down'} text-gray-400`}></i>
                        </button>
                        {expandedFAQ === faq.id && (
                          <div className="px-6 pb-4 border-t border-gray-200 bg-gray-50">
                            <p className="text-gray-700 mt-4">{faq.answer}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {filteredFAQs.length === 0 && (
                    <div className="text-center py-12">
                      <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                        <i className="fas fa-search text-3xl text-gray-400"></i>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No FAQ found</h3>
                      <p className="text-gray-500">Try adjusting your search or category filter.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Tickets Tab */}
              {activeTab === 'tickets' && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">My Support Tickets</h2>
                    <button
                      onClick={() => setActiveTab('contact')}
                      className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors"
                    >
                      <i className="fas fa-plus mr-2"></i>
                      New Ticket
                    </button>
                  </div>

                  <div className="space-y-4">
                    {supportTickets.map((ticket) => (
                      <div key={ticket.id} className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900 mb-2">#{ticket.id} - {ticket.subject}</h3>
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <span>Created: {new Date(ticket.createdAt).toLocaleDateString()}</span>
                              <span>Updated: {new Date(ticket.lastUpdate).toLocaleDateString()}</span>
                              <span className={getPriorityColor(ticket.priority)}>
                                <i className="fas fa-flag mr-1"></i>
                                {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)} Priority
                              </span>
                            </div>
                          </div>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                            {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {supportTickets.length === 0 && (
                    <div className="text-center py-12">
                      <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                        <i className="fas fa-ticket-alt text-3xl text-gray-400"></i>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No support tickets</h3>
                      <p className="text-gray-500 mb-6">You haven't submitted any support tickets yet.</p>
                      <button
                        onClick={() => setActiveTab('contact')}
                        className="bg-primary text-white px-6 py-3 rounded-md hover:bg-primary-dark transition-colors"
                      >
                        Submit Your First Ticket
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Contact Tab */}
              {activeTab === 'contact' && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Contact Support</h2>
                  
                  <form onSubmit={handleTicketSubmit} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                      <input
                        type="text"
                        required
                        value={ticketForm.subject}
                        onChange={(e) => setTicketForm(prev => ({ ...prev, subject: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                        placeholder="Brief description of your issue"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                        <select
                          value={ticketForm.category}
                          onChange={(e) => setTicketForm(prev => ({ ...prev, category: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                        >
                          <option value="general">General Support</option>
                          <option value="technical">Technical Issue</option>
                          <option value="account">Account Problem</option>
                          <option value="billing">Billing Question</option>
                          <option value="feature">Feature Request</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                        <select
                          value={ticketForm.priority}
                          onChange={(e) => setTicketForm(prev => ({ ...prev, priority: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                      <textarea
                        required
                        rows={6}
                        value={ticketForm.description}
                        onChange={(e) => setTicketForm(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                        placeholder="Please provide detailed information about your issue..."
                      />
                    </div>

                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => setTicketForm({
                          subject: '',
                          category: 'general',
                          priority: 'medium',
                          description: ''
                        })}
                        className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                      >
                        Clear
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
                      >
                        Submit Ticket
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}