'use client';

import React, { useState } from 'react';
import { Search, MessageSquare, User, Menu, X } from 'lucide-react';
import { HeaderProps } from '@/lib/types';

export default function Header({ 
  currentMode, 
  currentView, 
  onModeChange, 
  onViewChange, 
  currentUser, 
  onProfileClick 
}: HeaderProps) {
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
    // Messenger open functionality will be implemented later
    console.log('Open messenger');
  };

  const handleViewChange = (view: string) => {
    onViewChange(view as any);
    // Close mobile menu after navigation
    setIsMobileMenuOpen(false);
  };

  const getTitle = () => {
    if (currentView === 'feed') {
      return 'NEXUS FEED';
    } else if (currentView === 'resonance-field') {
      return 'RESONANCE FIELD';
    } else if (currentView === 'profile') {
      return 'USER PROFILE';
    }
    return currentMode === 'dream' ? 'NEXUS // DREAM SYNTHESIS' : 'NEXUS // LIMINAL LOGBOOK';
  };

  const getStatus = () => {
    if (currentView === 'feed') {
      return 'Public Stream Active';
    } else if (currentView === 'resonance-field') {
      return 'Personal Resonances';
    } else if (currentView === 'profile') {
      return 'Personal Profile';
    }
    return currentMode === 'dream' ? 'Dream State Active' : 'Logbook State Active';
  };

  const getStatusColor = () => {
    return currentMode === 'dream' ? 'text-purple-400' : 'text-emerald-active';
  };

  return (
    <header id="app-header" className="w-full flex-shrink-0 glass-header shadow-level-3 atmosphere-layer-1 depth-near depth-responsive header">
      <div className="max-w-[1600px] mx-auto flex justify-between items-center h-[72px] px-4 sm:px-8 header-content">
        {/* Mobile Menu Toggle - Only visible on mobile */}
        <button 
          className="mobile-menu-toggle lg:hidden text-text-primary hover:text-current-accent transition-colors" 
          id="mobileMenuToggle" 
          onClick={handleMobileMenuToggle}
          aria-label="Toggle mobile menu"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
        
        <div className="flex items-center gap-4 sm:gap-8">
          <div className="flex items-center gap-2 sm:gap-4">
            <h1 id="journal-title" className="text-lg sm:text-xl font-light tracking-wider text-text-primary transition-colors duration-500">
              {getTitle()}
            </h1>
            <span id="journal-status" className={`text-xs font-extralight tracking-widest uppercase transition-colors duration-500 ${getStatusColor()} hidden sm:inline`}>
              {getStatus()}
            </span>
          </div>
        </div>
        
        {/* Desktop Navigation - Hidden on mobile */}
        <div className="hidden lg:flex items-center gap-4">
          {/* Enhanced Search */}
          <div className={`search-container ${showSearch ? '' : 'hidden'}`} id="search-container">
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
                onClick={() => onViewChange('feed')}
              >
                Nexus Feed
              </li>
              <li 
                className="cursor-pointer"
                onClick={() => onViewChange('resonance-field')}
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
                onClick={() => onViewChange('profile')}
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
                    ? 'active-journal-btn' 
                    : ''
                } ripple-effect`}
                onClick={() => onModeChange('logbook')}
              >
                Logbook
              </button>
              <button 
                data-journal="dream" 
                className={`journal-toggle-btn ${
                  currentView === 'default' && currentMode === 'dream' 
                    ? 'active-journal-btn' 
                    : ''
                } ripple-effect`}
                onClick={() => onModeChange('dream')}
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

        {/* Mobile Profile Icon - Only visible on mobile */}
        <div className="lg:hidden">
          <button 
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

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed top-full left-0 right-0 bg-black/95 backdrop-blur-lg border-t border-white/10 z-50 max-h-[calc(100vh-60px)] overflow-y-auto">
          <div className="px-4 py-6 space-y-4">
            {/* Search */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Search className="w-4 h-4 text-gray-450" />
                <input 
                  type="text" 
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-quaternary focus:outline-none focus:border-current-accent/50" 
                  placeholder="Search entries, dreams, patterns..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Navigation Links */}
            <div className="space-y-2">
              <button 
                className={`w-full text-left py-3 px-4 rounded-lg transition-colors ${
                  currentView === 'feed' 
                    ? 'bg-current-accent/20 text-current-accent' 
                    : 'text-text-primary hover:bg-white/5'
                }`}
                onClick={() => handleViewChange('feed')}
              >
                Nexus Feed
              </button>
              <button 
                className={`w-full text-left py-3 px-4 rounded-lg transition-colors ${
                  currentView === 'resonance-field' 
                    ? 'bg-current-accent/20 text-current-accent' 
                    : 'text-text-primary hover:bg-white/5'
                }`}
                onClick={() => handleViewChange('resonance-field')}
              >
                Resonance Field
              </button>
              <button 
                className={`w-full text-left py-3 px-4 rounded-lg transition-colors ${
                  currentView === 'profile' 
                    ? 'bg-current-accent/20 text-current-accent' 
                    : 'text-text-primary hover:bg-white/5'
                }`}
                onClick={() => handleViewChange('profile')}
              >
                Profile
              </button>
            </div>

            {/* Journal Mode Toggle */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-text-tertiary uppercase tracking-wider px-4">Mode</div>
              <div className="flex gap-2">
                <button 
                  className={`flex-1 py-3 px-4 rounded-lg transition-colors ${
                    currentView === 'default' && currentMode === 'logbook' 
                      ? 'bg-emerald-500/20 text-emerald-400' 
                      : 'text-text-primary hover:bg-white/5 border border-white/10'
                  }`}
                  onClick={() => { onModeChange('logbook'); setIsMobileMenuOpen(false); }}
                >
                  Logbook
                </button>
                <button 
                  className={`flex-1 py-3 px-4 rounded-lg transition-colors ${
                    currentView === 'default' && currentMode === 'dream' 
                      ? 'bg-purple-500/20 text-purple-400' 
                      : 'text-text-primary hover:bg-white/5 border border-white/10'
                  }`}
                  onClick={() => { onModeChange('dream'); setIsMobileMenuOpen(false); }}
                >
                  Dream
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-4 border-t border-white/10">
              <button 
                className="w-full flex items-center gap-3 py-3 px-4 rounded-lg text-text-primary hover:bg-white/5 transition-colors"
                onClick={() => { handleMessengerOpen(); setIsMobileMenuOpen(false); }}
              >
                <MessageSquare className="w-5 h-5" />
                Messenger
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
} 