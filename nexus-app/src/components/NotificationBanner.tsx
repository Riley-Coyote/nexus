'use client';

import React, { useEffect } from 'react';
import { X, LucideIcon } from 'lucide-react';

interface NotificationBannerProps {
  show: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  variant?: 'info' | 'success' | 'warning' | 'error' | 'dream' | 'logbook';
  autoHide?: boolean;
  autoHideDelay?: number;
}

export default function NotificationBanner({
  show,
  onClose,
  title,
  subtitle,
  icon: Icon,
  variant = 'info',
  autoHide = true,
  autoHideDelay = 3000
}: NotificationBannerProps) {
  useEffect(() => {
    if (show && autoHide && autoHideDelay) {
      const timer = setTimeout(() => {
        onClose();
      }, autoHideDelay);
      
      return () => clearTimeout(timer);
    }
  }, [show, autoHide, autoHideDelay, onClose]);

  // Check if this is a localStorage JSON parsing error
  const isStorageError = title.includes('SyntaxError') && title.includes('not valid JSON');
  const isObjectObjectError = title.includes('[object Object]');

  if (!show) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return 'bg-[#69c4d8] border-emerald-400';
      case 'warning':
        return 'bg-[#69c4d8] border-yellow-400';
      case 'error':
        return 'bg-red-200 border-red-500';
      case 'dream':
        return 'bg-[#69c4d8] border-purple-400';
      case 'logbook':
        return 'bg-[#69c4d8] border-emerald-400';
      case 'info':
      default:
        return 'bg-[#69c4d8] border-emerald-400';
    }
  };

  const getIconColor = () => {
    switch (variant) {
      case 'success':
        return 'text-emerald-600';
      case 'warning':
        return 'text-yellow-600';
      case 'error':
        return 'text-red-600';
      case 'dream':
        return 'text-purple-600';
      case 'logbook':
        return 'text-emerald-600';
      case 'info':
      default:
        return 'text-emerald-600';
    }
  };

  return (
    <div className={`
      fixed top-4 right-4 z-[9999] 
      max-w-md w-full mx-4 p-4 rounded-lg shadow-lg backdrop-blur-md
      ${variant === 'success' 
        ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-100' 
        : variant === 'warning'
        ? 'bg-yellow-500/20 border border-yellow-500/30 text-yellow-100'
        : variant === 'error'
        ? 'bg-red-500/20 border border-red-500/30 text-red-100'
        : 'bg-blue-500/20 border border-blue-500/30 text-blue-100'
      }
      animate-slide-down
    `}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {variant === 'success' ? (
              <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : variant === 'warning' ? (
              <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            )}
            <h3 className="font-medium text-sm">
              {isStorageError || isObjectObjectError ? 'Storage Data Error' : 'Notification'}
            </h3>
          </div>
          <p className="text-sm opacity-90">
            {isStorageError || isObjectObjectError ? (
              <>
                Your browser's storage data has become corrupted. This can happen due to browser updates or storage issues.
                <br />
                <button 
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      // Try to access the auth service to clear data
                      try {
                        import('../lib/services/authService').then(({ authService }) => {
                          authService.clearAllStorageData();
                          window.location.reload();
                        });
                      } catch (error) {
                        // Fallback: manual localStorage clear
                        const keys = Object.keys(localStorage).filter(key => 
                          key.startsWith('nexus_') || key.startsWith('liminal_') || key === 'nexusInteractionState'
                        );
                        keys.forEach(key => localStorage.removeItem(key));
                        window.location.reload();
                      }
                    }
                  }}
                  className="mt-2 px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-xs font-medium transition-colors underline"
                >
                  Fix This Issue
                </button>
              </>
            ) : (
              title
            )}
          </p>
        </div>
        <button
          onClick={onClose}
          className="ml-3 text-current opacity-70 hover:opacity-100 transition-opacity"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
} 