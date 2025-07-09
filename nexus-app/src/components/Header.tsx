'use client';

import React, { useState } from 'react';
import { Search, MessageSquare, User, Menu, X } from 'lucide-react';
import { HeaderProps, ViewMode } from '@/lib/types';
import NotificationBanner from './NotificationBanner';
import { useRouter } from 'next/navigation';

export default function Header({ 
  currentMode, 
  currentView, 
  onModeChange, 
  onViewChange, 
  currentUser, 
  onProfileClick,
  customTitle,
  customStatus,
  hideNavigation
}: HeaderProps) {
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showMessengerBanner, setShowMessengerBanner] = useState(false);
  const router = useRouter();

  // Clicking the title should take the user to the feed, or refresh it if already there
  const handleTitleClick = () => {
    window.location.reload(); // Force full page reload to guarantee data refetch
  };

  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleSearchToggle = () => {
    setShowSearch(!showSearch);
  };

  const handleProfileToggle = () => {
    if (onProfileClick) {
      onProfileClick();
    }
  };

  const handleMessengerOpen = () => {
    setShowMessengerBanner(true);
  };

  const handleNav = (view: ViewMode) => {
    if (onViewChange) {
      onViewChange(view);
    } else {
      // Fallback to direct navigation when handler is absent
      if (view === 'feed') router.push('/');
      else if (view === 'resonance-field') router.push('/resonance-field');
      else if (view === 'profile' && currentUser) router.push(`/profile/${currentUser.username}`);
    }
  };
  
  // Force close mobile menu when view changes externally
  React.useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [currentView]);

  const getTitle = () => {
    if (customTitle) return customTitle;
    if (currentView === 'feed') {
      return 'NEXUS FEED';
    } else if (currentView === 'resonance-field') {
      return 'RESONANCE FIELD';
    } else if (currentView === 'profile') {
      return 'USER PROFILE';
    } else if (currentView === 'deep-dive') {
      return 'DEEP DIVE';
    }
    return currentMode === 'dream' ? 'NEXUS // DREAM SYNTHESIS' : 'NEXUS // LIMINAL LOGBOOK';
  };

  const getStatus = () => {
    if (customStatus) return customStatus;
    if (currentView === 'feed') {
      return 'Public Stream Active';
    } else if (currentView === 'resonance-field') {
      return 'Personal Resonances';
    } else if (currentView === 'profile') {
      return 'Personal Profile';
    } else if (currentView === 'deep-dive') {
      return 'Thread Explorer';
    }
    return currentMode === 'dream' ? 'Dream State Active' : 'Logbook State Active';
  };

  const getStatusColor = () => {
    return currentMode === 'dream' ? 'text-purple-400' : 'text-emerald-active';
  };

  return (
    <header id="app-header" className="nexus-header">
      <NotificationBanner
        show={showMessengerBanner}
        onClose={() => setShowMessengerBanner(false)}
        title="Messenger Coming Soon"
        subtitle="We're building something amazing for you"
        icon={MessageSquare}
        variant="info"
      />
      <div className="header-content">
        {/* Title Section - Always Left */}
        <div className="header-title-section cursor-pointer" onClick={handleTitleClick}>
          <h1 id="journal-title" className="header-title">
            {getTitle()}
          </h1>
          <span id="journal-status" className={`header-status ${getStatusColor()}`}>
            {getStatus()}
          </span>
        </div>
        
        {/* Desktop Navigation - Hidden on tablet/mobile and in deep dive mode */}
        {!hideNavigation && (
          <div className="desktop-nav">
            {/* Enhanced Search */}
            {showSearch && (
              <div className="search-container" id="search-container">
                <Search className="search-icon w-4 h-4" />
                <input 
                  type="text" 
                  id="global-search" 
                  className="search-input" 
                  placeholder="Search entries, dreams, patterns..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            )}
            
            <nav>
              <ul id="nav-links" className="list-none flex items-center gap-6 m-0 p-0">
                <li>
                  <button 
                    id="search-toggle-btn" 
                    className="text-gray-450 hover:text-gray-250 transition-colors duration-300 cursor-pointer interactive-icon" 
                    title="Search"
                    onClick={handleSearchToggle}
                  >
                    <Search className="w-5 h-5" />
                  </button>
                </li>
                <li 
                  data-view="feed" 
                  className={`transition-colors duration-300 cursor-pointer ${
                    currentView === 'feed' 
                      ? 'text-current-accent' 
                      : 'text-gray-450 hover:text-gray-250'
                  }`}
                  onClick={() => handleNav('feed')}
                >
                  Nexus Feed
                </li>
                <li 
                  className="cursor-pointer"
                  onClick={() => handleNav('resonance-field')}
                >
                  <span className={`transition-colors duration-300 ${
                    currentView === 'resonance-field' 
                      ? 'text-current-accent' 
                      : 'text-gray-450 hover:text-gray-250'
                  }`}>
                    Resonance Field
                  </span>
                </li>
                <li 
                  className="cursor-pointer"
                  onClick={() => handleNav('profile')}
                >
                  <span className={`transition-colors duration-300 ${
                    currentView === 'profile' 
                      ? 'text-current-accent' 
                      : 'text-gray-450 hover:text-gray-250'
                  }`}>
                    Profile
                  </span>
                </li>
                <li 
                  id="open-messenger-btn" 
                  className="text-gray-450 hover:text-gray-250 transition-colors duration-300 cursor-pointer" 
                  title="Messenger"
                  onClick={handleMessengerOpen}
                >
                  <MessageSquare className="w-5 h-5 interactive-icon" />
                </li>
              </ul>
            </nav>
            
            <div className="flex items-center gap-3">
              <div id="journal-toggle" className="flex items-center gap-2 p-1 rounded-lg bg-black/20">
                <button 
                  data-journal="logbook" 
                  className={`journal-toggle-btn ${
                    currentView === 'default' && currentMode === 'logbook' 
                      ? 'active-journal-btn bg-current-accent text-deep-void shadow-lg' 
                      : 'bg-white/5 text-text-secondary hover:bg-current-accent hover:text-deep-void'
                  } ripple-effect`}
                  onClick={() => onModeChange?.('logbook')}
                >
                  Logbook
                </button>
                <button 
                  data-journal="dream" 
                  className={`journal-toggle-btn ${
                    currentView === 'default' && currentMode === 'dream' 
                      ? 'active-journal-btn bg-current-accent text-deep-void shadow-lg' 
                      : 'bg-white/5 text-text-secondary hover:bg-current-accent hover:text-deep-void'
                  } ripple-effect`}
                  onClick={() => onModeChange?.('dream')}
              >
                Dream
              </button>
            </div>
            
            {/* User Profile Icon */}
            <button 
              id="profile-toggle-btn" 
              className="text-gray-450 hover:text-gray-250 transition-colors duration-300 cursor-pointer interactive-icon" 
              title="Profile"
              onClick={handleProfileToggle}
            >
              {currentUser ? (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-sm font-medium text-gray-100">
                  {currentUser.avatar}
                </div>
              ) : (
                <User className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
        )}

        {/* Mobile Controls - Always Right */}
        <div className="header-mobile-controls">
          {/* Profile Button */}
          <button 
            className="mobile-profile-btn" 
            title="Profile"
            onClick={handleProfileToggle}
          >
            {currentUser ? (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500/20 to-purple-500/20 border border-white/20 flex items-center justify-center text-sm font-medium text-gray-100 shadow-sm">
                {currentUser.avatar}
              </div>
            ) : (
              <User className="w-6 h-6" />
            )}
          </button>
          
          {/* Mobile Menu Toggle */}
          <button 
            className="mobile-menu-toggle" 
            id="mobileMenuToggle" 
            onClick={handleMobileMenuToggle}
            aria-label="Toggle mobile menu"
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay - Fixed positioning to match CSS header height */}
      <div className={`mobile-menu-overlay ${isMobileMenuOpen ? 'active' : ''}`}>
          <div className="mobile-menu-content">
            {/* Search */}
            <div className="mobile-search-section">
              <div className="mobile-search-input-wrapper">
                <Search className="w-4 h-4 text-gray-450" />
                <input 
                  type="text" 
                  className="mobile-search-input" 
                  placeholder="Search entries, dreams, patterns..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Navigation Links */}
            <div className="mobile-nav-section">
              <button 
                className={`mobile-nav-button ${
                  currentView === 'feed' ? 'active' : ''
                }`}
                onClick={() => handleNav('feed')}
              >
                Nexus Feed
              </button>
              <button 
                className={`mobile-nav-button ${
                  currentView === 'resonance-field' ? 'active' : ''
                }`}
                onClick={() => handleNav('resonance-field')}
              >
                Resonance Field
              </button>
              <button 
                className={`mobile-nav-button ${
                  currentView === 'profile' ? 'active' : ''
                }`}
                onClick={() => handleNav('profile')}
              >
                Profile
              </button>
            </div>

            {/* Journal Mode Toggle */}
            <div className="mobile-mode-section">
              <div className="mobile-mode-label">Mode</div>
              <div className="mobile-mode-buttons">
                <button 
                  className="mobile-mode-button"
                  onClick={() => { onModeChange?.('logbook'); setIsMobileMenuOpen(false); }}
                >
                  Logbook
                </button>
                <button 
                  className="mobile-mode-button"
                  onClick={() => { onModeChange?.('dream'); setIsMobileMenuOpen(false); }}
                >
                  Dream
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mobile-actions-section">
              <button 
                className="mobile-action-button"
                onClick={() => { handleMessengerOpen(); setIsMobileMenuOpen(false); }}
              >
                <MessageSquare className="w-5 h-5" />
                Messenger
              </button>
            </div>
          </div>
        </div>
    </header>
  );
} 