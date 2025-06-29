'use client';

import React, { useState } from 'react';
import { Search, MessageSquare, User, Menu } from 'lucide-react';
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

  const handleMobileMenuToggle = () => {
    // Mobile sidebar toggle functionality will be implemented later
    console.log('Mobile menu toggle');
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

  const getTitle = () => {
    if (currentView === 'feed') {
      return 'NEXUS FEED';
    } else if (currentView === 'resonance-field') {
      return 'RESONANCE FIELD';
    }
    return currentMode === 'dream' ? 'NEXUS // DREAM SYNTHESIS' : 'NEXUS // LIMINAL LOGBOOK';
  };

  const getStatus = () => {
    if (currentView === 'feed') {
      return 'Public Stream Active';
    } else if (currentView === 'resonance-field') {
      return 'Personal Resonances';
    }
    return currentMode === 'dream' ? 'Dream State Active' : 'Logbook State Active';
  };

  const getStatusColor = () => {
    return currentMode === 'dream' ? 'text-purple-400' : 'text-emerald-active';
  };

  return (
    <header id="app-header" className="w-full flex-shrink-0 glass-header shadow-level-3 atmosphere-layer-1 depth-near depth-responsive header">
      <div className="max-w-[1600px] mx-auto flex justify-between items-center h-[72px] px-8 header-content">
        {/* Mobile Menu Toggle */}
        <button 
          className="mobile-menu-toggle hidden" 
          id="mobileMenuToggle" 
          onClick={handleMobileMenuToggle}
        >
          <Menu className="w-6 h-6" />
        </button>
        
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-4">
            <h1 id="journal-title" className="text-xl font-light tracking-wider text-text-primary transition-colors duration-500">
              {getTitle()}
            </h1>
            <span id="journal-status" className={`text-xs font-extralight tracking-widest uppercase transition-colors duration-500 ${getStatusColor()}`}>
              {getStatus()}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
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
                data-view="resonance-field" 
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
                id="open-messenger-btn" 
                className="text-gray-450 hover:text-gray-250 transition-colors duration-300 cursor-pointer" 
                title="Messenger"
                onClick={handleMessengerOpen}
              >
                <MessageSquare className="w-5 h-5 interactive-icon" />
              </li>
              <li>
                <button 
                  id="profile-toggle-btn" 
                  className="flex items-center gap-2 text-gray-450 hover:text-gray-250 transition-colors duration-300 cursor-pointer interactive-icon" 
                  title="Profile"
                  onClick={handleProfileToggle}
                >
                  {currentUser ? (
                    <>
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-xs font-medium text-gray-100">
                        {currentUser.avatar}
                      </div>
                      <span className="text-sm font-medium hidden sm:inline">
                        {currentUser.name}
                      </span>
                    </>
                  ) : (
                    <User className="w-5 h-5" />
                  )}
                </button>
              </li>
            </ul>
          </nav>
          
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
        </div>
      </div>
    </header>
  );
} 