'use client';

import React, { useState, useEffect, useRef } from 'react';
import AuthPanel from './AuthPanel';
import { useAuth } from '@/hooks/useAuth';

interface AuthProviderProps {
  children: React.ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const { user, isAuthenticated, isLoading, forceAuthRefresh } = useAuth();
  const [showEmergencyRecovery, setShowEmergencyRecovery] = useState(false);
  const [emergencyCountdown, setEmergencyCountdown] = useState(10);
  const emergencyCountdownRef = useRef<NodeJS.Timeout | null>(null);

  // Emergency recovery mechanism - if auth is stuck loading for too long
  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setShowEmergencyRecovery(true);
        
        // Start countdown for auto-refresh
        emergencyCountdownRef.current = setInterval(() => {
          setEmergencyCountdown(prev => {
            if (prev <= 1) {
              handleEmergencyRefresh();
              return 10;
            }
            return prev - 1;
          });
        }, 1000);
      }, 8000); // Show emergency recovery after 8 seconds

      return () => {
        clearTimeout(timer);
        if (emergencyCountdownRef.current) {
          clearInterval(emergencyCountdownRef.current);
        }
      };
    } else {
      setShowEmergencyRecovery(false);
      setEmergencyCountdown(10);
      if (emergencyCountdownRef.current) {
        clearInterval(emergencyCountdownRef.current);
      }
    }
  }, [isLoading]);

  const handleEmergencyRefresh = async () => {
    console.log('🚨 Emergency auth refresh triggered');
    if (emergencyCountdownRef.current) {
      clearInterval(emergencyCountdownRef.current);
    }
    setShowEmergencyRecovery(false);
    setEmergencyCountdown(10);
    
    try {
      await forceAuthRefresh();
    } catch (error) {
      console.error('Emergency refresh failed:', error);
      // Last resort - page refresh
      window.location.reload();
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-deep-void">
        <div className="text-center">
          <div className="text-text-secondary mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-primary mx-auto"></div>
          </div>
          <div className="text-text-secondary text-sm">
            Authenticating...
          </div>
          
          {showEmergencyRecovery && (
            <div className="mt-6 p-4 bg-red-900/20 rounded border border-red-700/30">
              <div className="text-red-400 text-sm mb-3">
                🚨 Authentication appears to be stuck. This usually resolves with a page refresh.
              </div>
              
              <div className="text-red-300 text-xs mb-3">
                Auto-refresh in {emergencyCountdown} seconds or click below:
              </div>
              
              <div className="flex gap-2 justify-center">
                <button
                  onClick={handleEmergencyRefresh}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
                >
                  Refresh Now
                </button>
                
                <button
                  onClick={() => {
                    if (emergencyCountdownRef.current) {
                      clearInterval(emergencyCountdownRef.current);
                    }
                    setShowEmergencyRecovery(false);
                  }}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition-colors"
                >
                  Cancel Auto-refresh
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show authentication panel if not authenticated
  if (!isAuthenticated) {
    return <AuthPanel onAuthSuccess={forceAuthRefresh} />;
  }

  // Render the app if authenticated
  return <>{children}</>;
} 