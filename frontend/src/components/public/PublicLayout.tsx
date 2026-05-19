'use client';

import React from 'react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface PublicLayoutProps {
  children: React.ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  
  // useAuth must be called unconditionally (React hooks rule)
  // If AuthContext throws, it means AuthProvider is missing, which should not happen
  // But we'll handle it gracefully
  const authContext = useAuth();
  const { isAuthenticated, logout, user } = authContext || {
    isAuthenticated: false,
    logout: async () => {},
    user: null,
  };
  
  // Set current year only on client side to avoid hydration mismatch
  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  // Close dropdown menu when clicking outside or pressing ESC
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isUserMenuOpen && !(event.target as Element).closest('.user-menu-container')) {
        setIsUserMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isUserMenuOpen) {
        setIsUserMenuOpen(false);
      }
    };

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isUserMenuOpen]);

  const navigation = [
    { name: 'Home', href: '/' },
    { name: 'About Us', href: '/about' },
    { name: 'Events', href: '/events' },
    { name: 'Past Conference', href: '/conferences' },
    { name: 'Our Sponsors', href: '/sponsors' },
    { name: 'Contact Us', href: '/contact' },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      // Close user menu after logout
      setIsUserMenuOpen(false);
      // Force a page reload to ensure clean state (optional, but helps clear any cached state)
      // window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout fails, clear local state
      setIsUserMenuOpen(false);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
    };

    // Only add event listener on client side
    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const scrollToTop = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-white">
          {/* Skip to main content link for accessibility */}
          <a 
            href="#main-content" 
            className="absolute left-[-9999px] z-[999] p-4 bg-accent text-white no-underline focus:left-1/2 focus:transform focus:-translate-x-1/2 focus:top-2.5"
          >
            Skip to main content
          </a>

      {/* Header */}
      <header className="bg-primary-dark sticky top-0 z-[100] shadow-lg" role="banner">
        <div className="container mx-auto px-5 max-w-[1200px]">
          <nav className="flex justify-between items-center py-[15px]" role="navigation" aria-label="Main navigation">
            <Link href="/" className="flex items-center">
              <img src="/images/icons/giip-logo.png" alt="GIIP Logo" className="h-10 mr-2.5" />
              <div className="text-white text-[22px] font-bold tracking-wide hidden">GIIP</div>
            </Link>

            <div className="hidden md:flex items-center">
              <ul className="nav-links flex list-none">
                {navigation.map((item) => (
                  <li key={item.name} className="ml-[30px]">
                    <Link
                      href={item.href}
                      className="text-white no-underline font-medium text-base transition-all duration-300 relative py-1.5 hover:text-accent after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-accent after:transition-all after:duration-300 hover:after:w-full"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>

              {/* User Menu (Desktop) */}
              <div className="auth-links ml-[40px] relative">
                {isAuthenticated ? (
                  <div className="relative user-menu-container">
                    {/* User Avatar Dropdown */}
                    <button
                      onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                      className="flex items-center gap-2 text-white no-underline font-medium text-base transition-all duration-300 py-2 px-3 rounded-md hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/50"
                      aria-label="User menu"
                      aria-expanded={isUserMenuOpen}
                    >
                      {/* Avatar */}
                      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold text-sm border-2 border-white/30">
                        {user?.profile?.firstName ? (
                          user.profile.firstName.charAt(0).toUpperCase()
                        ) : user?.username ? (
                          user.username.charAt(0).toUpperCase()
                        ) : (
                          'U'
                        )}
                      </div>
                      {/* Dropdown Arrow */}
                      <i className={`fas fa-chevron-down text-xs transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`}></i>
                    </button>

                    {/* Dropdown Menu */}
                    {isUserMenuOpen && (
                      <>
                        {/* Backdrop to close menu */}
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setIsUserMenuOpen(false)}
                        ></div>
                        {/* Menu */}
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                          {/* User Info */}
                          <div className="px-4 py-3 border-b border-gray-200">
                            <p className="text-sm font-medium text-gray-900">
                              {user?.profile?.firstName && user?.profile?.lastName
                                ? `${user.profile.firstName} ${user.profile.lastName}`
                                : user?.username || 'User'}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                          </div>
                          
                          {/* Menu Items */}
                          <Link
                            href="/dashboard"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            <i className="fas fa-tachometer-alt mr-2"></i>
                            Dashboard
                          </Link>
                          <Link
                            href="/dashboard/profile"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            <i className="fas fa-user mr-2"></i>
                            Profile
                          </Link>
                          <div className="border-t border-gray-200 my-1"></div>
                          <button
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              handleLogout();
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <i className="fas fa-sign-out-alt mr-2"></i>
                            Sign Out
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ) : null}
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button
              type="button"
              className="mobile-menu-btn inline-flex md:hidden items-center justify-center bg-transparent border-none text-white text-2xl cursor-pointer px-2.5 py-1.5 z-[110] min-w-[44px] min-h-[44px]"
              aria-label="Toggle navigation menu"
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {/* Inline SVG: works when Font Awesome is blocked by CSP */}
              {isMenuOpen ? (
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="w-6 h-6"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              ) : (
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="w-6 h-6"
                >
                  <path d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </nav>
        </div>
      </header>

          {/* Mobile Menu Overlay */}
          <div 
            className={`menu-overlay fixed top-0 left-0 right-0 bottom-0 bg-black/50 z-[104] transition-all duration-300 ${isMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
            aria-hidden="true"
            onClick={() => setIsMenuOpen(false)}
          ></div>

          {/* Mobile Navigation Drawer */}
          <nav 
            className={`nav-links md:hidden fixed top-0 w-[85%] max-w-[320px] h-screen bg-primary-dark flex flex-col pt-20 px-[25px] pb-[30px] shadow-[2px_0_15px_rgba(0,0,0,0.2)] z-[105] transition-all duration-400 ${isMenuOpen ? 'left-0' : '-left-full'}`}
            aria-label="Mobile navigation"
            role="navigation"
          >
            <ul className="list-none">
              {navigation.map((item) => (
                <li key={item.name} className="mb-[12px] border-b border-white/10 last:border-b-0">
                  <Link
                    href={item.href}
                    className="text-white no-underline block text-[16px] leading-[11.2px] py-[10px] px-3"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="auth-links-mobile mt-6 pt-6 border-t border-white/10">
              {isAuthenticated ? (
                <>
                  {/* User Info */}
                  <div className="px-3 py-3 mb-3 border border-white/30 rounded-md bg-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold text-sm border-2 border-white/30">
                        {user?.profile?.firstName ? (
                          user.profile.firstName.charAt(0).toUpperCase()
                        ) : user?.username ? (
                          user.username.charAt(0).toUpperCase()
                        ) : (
                          'U'
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">
                          {user?.profile?.firstName && user?.profile?.lastName
                            ? `${user.profile.firstName} ${user.profile.lastName}`
                            : user?.username || 'User'}
                        </p>
                        <p className="text-white/70 text-xs truncate">{user?.email}</p>
                      </div>
                    </div>
                  </div>
                  
                  <Link
                    href="/dashboard"
                    className="text-white no-underline block text-[16px] leading-[11.2px] py-[10px] px-3 mb-3 border border-white/30 rounded-md text-center transition-all duration-300 hover:bg-white hover:text-primary-dark"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <i className="fas fa-tachometer-alt mr-2"></i>
                    Dashboard
                  </Link>
                  <Link
                    href="/dashboard/profile"
                    className="text-white no-underline block text-[16px] leading-[11.2px] py-[10px] px-3 mb-3 border border-white/30 rounded-md text-center transition-all duration-300 hover:bg-white hover:text-primary-dark"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <i className="fas fa-user mr-2"></i>
                    Profile
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout()
                      setIsMenuOpen(false)
                    }}
                    className="bg-accent text-white no-underline block text-[16px] leading-[11.2px] py-[10px] px-3 rounded-md text-center transition-all duration-300 hover:bg-accent/90 w-full"
                  >
                    <i className="fas fa-sign-out-alt mr-2"></i>
                    Sign Out
                  </button>
                </>
              ) : null}
            </div>
          </nav>

          {/* Main Content */}
          <main id="main-content" role="main" className="flex-1">
            {children}
          </main>

          {/* Footer */}
          <footer className="bg-primary-dark text-white py-12" role="contentinfo">
            <div className="container mx-auto px-5 max-w-[1200px]">
              <div className="footer-container grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-10 md:gap-[30px] mb-10 md:mb-[30px]">
                <div className="footer-col hidden md:block">
                  <h3 className="text-[1.2rem] md:text-[17px] mb-[25px] relative pb-2.5 leading-normal md:leading-[1.4] after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-[50px] after:h-[3px] after:bg-accent">
                    Quick Links
                  </h3>
                  <ul className="footer-links list-none">
                    <li className="mb-3">
                      <Link href="/" className="text-white/80 no-underline transition-all duration-300 text-[0.9rem] md:text-[15px] leading-normal md:leading-normal hover:text-accent hover:pl-1.5">
                        Home
                      </Link>
                    </li>
                    <li className="mb-3">
                      <Link href="/about" className="text-white/80 no-underline transition-all duration-300 text-[0.9rem] md:text-[15px] leading-normal md:leading-normal hover:text-accent hover:pl-1.5">
                        About Us
                      </Link>
                    </li>
                    <li className="mb-3">
                      <Link href="/events" className="text-white/80 no-underline transition-all duration-300 text-[0.9rem] md:text-[15px] leading-normal md:leading-normal hover:text-accent hover:pl-1.5">
                        Events
                      </Link>
                    </li>
                    <li className="mb-3">
                      <Link href="/conferences" className="text-white/80 no-underline transition-all duration-300 text-[0.9rem] md:text-[15px] leading-normal md:leading-normal hover:text-accent hover:pl-1.5">
                        Past Conference
                      </Link>
                    </li>
                    <li className="mb-3">
                      <Link href="/sponsors" className="text-white/80 no-underline transition-all duration-300 text-[0.9rem] md:text-[15px] leading-normal md:leading-normal hover:text-accent hover:pl-1.5">
                        Our Sponsors
                      </Link>
                    </li>
                    <li className="mb-3">
                      <Link href="/contact" className="text-white/80 no-underline transition-all duration-300 text-[0.9rem] md:text-[15px] leading-normal md:leading-normal hover:text-accent hover:pl-1.5">
                        Contact Us
                      </Link>
                    </li>
                  </ul>
                </div>

            <div className="footer-col hidden md:block">
              <h3 className="text-[1.2rem] md:text-[17px] mb-[25px] relative pb-2.5 leading-normal md:leading-[1.4] after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-[50px] after:h-[3px] after:bg-accent">
                Legal
              </h3>
              <ul className="footer-links list-none">
                <li className="mb-3">
                  <Link href="/terms" className="text-white/80 no-underline transition-all duration-300 text-[0.9rem] md:text-[15px] leading-normal md:leading-normal hover:text-accent hover:pl-1.5">
                    Terms & Conditions
                  </Link>
                </li>
                <li className="mb-3">
                  <Link href="/privacy" className="text-white/80 no-underline transition-all duration-300 text-[0.9rem] md:text-[15px] leading-normal md:leading-normal hover:text-accent hover:pl-1.5">
                    Privacy & Cookie Notice
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 pt-6 text-center text-sm text-white/70">
            <p suppressHydrationWarning>&copy; {currentYear ?? 2024} GIIP (Global Innovation and Intellectual Property). All rights reserved.</p>
            <p className="mt-2">
              <a 
                href="https://beian.mps.gov.cn/#/query/webSearch?code=31010102008484" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-white/70 no-underline hover:text-white transition-colors"
              >
                沪公网安备31010102008484号
              </a>
              {' | '}
              <a 
                href="https://beian.miit.gov.cn/#/Integrated/index" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-white/70 no-underline hover:text-white transition-colors"
              >
                沪ICP备18022736号-5
              </a>
            </p>
          </div>
        </div>
      </footer>

      {/* Back to Top Button */}
      <button
        className={`back-to-top fixed bottom-[30px] right-[30px] w-[50px] h-[50px] bg-accent text-white rounded-full flex items-center justify-center text-xl shadow-[0_4px_12px_rgba(0,0,0,0.1)] cursor-pointer transition-all duration-300 z-[99] hover:bg-primary hover:-translate-y-1 border-none ${
          showBackToTop ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}
        aria-label="Back to top"
        onClick={scrollToTop}
      >
        {/* Use inline SVG so the arrow is visible even if FontAwesome CSS is blocked */}
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-6 h-6"
        >
          <path d="M12 19V5" />
          <path d="M5 12l7-7 7 7" />
        </svg>
      </button>
    </div>
  );
}