'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';

interface UserProfile {
  id: number;
  name: string;
  email: string;
  avatar: string;
  role: string;
  organization: string;
  location: string;
  bio: string;
  interests: string[];
  skills: string[];
  experience: string;
  education: string[];
  publications: string[];
  connectionStatus: 'none' | 'pending' | 'connected';
  joinDate: string;
  lastActive: string;
  stats: {
    connections: number;
    eventsAttended: number;
    articlesPublished: number;
  };
}

export default function UserProfilePage() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);

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
      
      // Load user profile (mock data for now)
      const userId = parseInt(params.id as string);
      const mockUser: UserProfile = {
        id: userId,
        name: 'Dr. Sarah Chen',
        email: 'sarah.chen@university.edu',
        avatar: '/images/features/innovation.jpg',
        role: 'IP Researcher',
        organization: 'Stanford University',
        location: 'California, USA',
        bio: 'Dr. Sarah Chen is a leading researcher in artificial intelligence and intellectual property law. With over 15 years of experience in the field, she has published numerous papers on AI patent landscapes and innovation policy. She currently leads the IP Research Lab at Stanford University and serves as an advisor to several tech startups.',
        interests: ['AI Patents', 'Innovation Policy', 'Technology Transfer', 'Patent Analytics', 'IP Strategy'],
        skills: ['Patent Analysis', 'Research Methodology', 'Policy Development', 'Data Analytics', 'Academic Writing'],
        experience: '15+ years in IP research and policy development',
        education: [
          'Ph.D. in Law, Stanford University (2008)',
          'M.S. in Computer Science, MIT (2004)',
          'B.S. in Engineering, UC Berkeley (2002)'
        ],
        publications: [
          'AI Patent Landscapes: Trends and Implications (2024)',
          'Innovation Policy in the Digital Age (2023)',
          'Technology Transfer Best Practices (2022)',
          'Patent Analytics for Strategic Decision Making (2021)'
        ],
        connectionStatus: 'connected',
        joinDate: '2020-03-15',
        lastActive: '2024-05-20T10:30:00Z',
        stats: {
          connections: 342,
          eventsAttended: 28,
          articlesPublished: 45
        }
      };
      
      setUser(mockUser);
      setLoading(false);
    };

    checkAuth();
  }, [router, params.id]);

  const sendConnectionRequest = () => {
    if (user) {
      setUser(prev => prev ? { ...prev, connectionStatus: 'pending' } : null);
    }
  };

  const sendMessage = () => {
    router.push(`/messages?user=${user?.id}`);
  };

  const getConnectionStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'none':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getConnectionStatusText = (status: string) => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'pending':
        return 'Connection Pending';
      case 'none':
        return 'Not Connected';
      default:
        return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">User not found</h2>
          <p className="text-gray-600 mb-4">The user profile you're looking for doesn't exist.</p>
          <button
            onClick={() => router.push('/users')}
            className="bg-primary text-white px-6 py-3 rounded-md hover:bg-primary-dark transition-colors"
          >
            Back to Network
          </button>
        </div>
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
              <h1 className="text-2xl font-bold text-primary-dark">User Profile</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/users')}
                className="text-primary hover:text-primary-dark font-medium"
              >
                Back to Network
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Profile Header */}
          <div className="bg-white shadow rounded-lg mb-6">
            <div className="px-6 py-8">
              <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
                <div className="relative">
                  <Image
                    src={user.avatar}
                    alt="Profile Picture"
                    width={120}
                    height={120}
                    className="rounded-full object-cover"
                  />
                  <div className="absolute bottom-0 right-0">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getConnectionStatusColor(user.connectionStatus)}`}>
                      {getConnectionStatusText(user.connectionStatus)}
                    </span>
                  </div>
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
                  <p className="text-gray-600">{user.role} at {user.organization}</p>
                  <p className="text-gray-500 text-sm mt-1">
                    <i className="fas fa-map-marker-alt mr-1"></i>
                    {user.location}
                  </p>
                  <p className="text-gray-500 text-sm">
                    <i className="fas fa-calendar mr-1"></i>
                    Member since {new Date(user.joinDate).toLocaleDateString()}
                  </p>
                  <p className="text-gray-500 text-sm">
                    <i className="fas fa-clock mr-1"></i>
                    Last active {new Date(user.lastActive).toLocaleDateString()}
                  </p>
                  
                  <div className="mt-4 flex flex-col sm:flex-row gap-3">
                    {user.connectionStatus === 'none' && (
                      <button
                        onClick={sendConnectionRequest}
                        className="bg-primary text-white px-6 py-2 rounded-md hover:bg-primary-dark transition-colors"
                      >
                        <i className="fas fa-user-plus mr-2"></i>
                        Send Connection Request
                      </button>
                    )}
                    {user.connectionStatus === 'pending' && (
                      <button
                        disabled
                        className="bg-gray-300 text-gray-500 px-6 py-2 rounded-md cursor-not-allowed"
                      >
                        <i className="fas fa-clock mr-2"></i>
                        Connection Pending
                      </button>
                    )}
                    {user.connectionStatus === 'connected' && (
                      <button
                        onClick={sendMessage}
                        className="bg-primary text-white px-6 py-2 rounded-md hover:bg-primary-dark transition-colors"
                      >
                        <i className="fas fa-envelope mr-2"></i>
                        Send Message
                      </button>
                    )}
                    <button className="border border-primary text-primary px-6 py-2 rounded-md hover:bg-primary hover:text-white transition-colors">
                      <i className="fas fa-share mr-2"></i>
                      Share Profile
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-6 text-center">
              <div className="text-2xl font-bold text-primary">{user.stats.connections}</div>
              <div className="text-gray-600">Connections</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6 text-center">
              <div className="text-2xl font-bold text-primary">{user.stats.eventsAttended}</div>
              <div className="text-gray-600">Events Attended</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6 text-center">
              <div className="text-2xl font-bold text-primary">{user.stats.articlesPublished}</div>
              <div className="text-gray-600">Articles Published</div>
            </div>
          </div>

          {/* Profile Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* About */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">About</h3>
              </div>
              <div className="px-6 py-4">
                <p className="text-gray-700">{user.bio}</p>
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Experience</h4>
                  <p className="text-gray-600">{user.experience}</p>
                </div>
              </div>
            </div>

            {/* Interests & Skills */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Interests & Skills</h3>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Areas of Interest</h4>
                  <div className="flex flex-wrap gap-2">
                    {user.interests.map((interest, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-light text-primary-dark"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {user.skills.map((skill, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Education */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Education</h3>
              </div>
              <div className="px-6 py-4">
                <div className="space-y-3">
                  {user.education.map((edu, index) => (
                    <div key={index} className="flex items-start">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-3"></div>
                      <p className="text-gray-700">{edu}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Publications */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Recent Publications</h3>
              </div>
              <div className="px-6 py-4">
                <div className="space-y-3">
                  {user.publications.map((publication, index) => (
                    <div key={index} className="flex items-start">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-3"></div>
                      <p className="text-gray-700">{publication}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}