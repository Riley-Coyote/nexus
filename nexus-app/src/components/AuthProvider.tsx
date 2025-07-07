'use client';

import React, { useState, useEffect, useRef } from 'react';
import AuthPanel from '@/components/AuthPanel';
import { useNexusData } from '@/hooks/useNexusData';

interface AuthProviderProps {
  children: React.ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const nexusData = useNexusData();
  const [showStuckStateRecovery, setShowStuckStateRecovery] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const componentMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      componentMountedRef.current = false;
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  // Recovery mechanism for stuck auth states
  useEffect(() => {
    if (nexusData.authState.isAuthLoading) {
      // Clear any existing timeout
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      
      // Set a timeout to detect stuck loading states
      loadingTimeoutRef.current = setTimeout(() => {
        if (componentMountedRef.current) {
          setShowStuckStateRecovery(true);
        }
      }, 10000); // Reduced to 10 seconds for better UX
    } else {
      // Clear timeout if loading completes
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      if (componentMountedRef.current) {
        setShowStuckStateRecovery(false);
      }
    }
  }, [nexusData.authState.isAuthLoading]);

  const handleRecoveryRefresh = async () => {
    setIsRecovering(true);
    try {
      await nexusData.forceAuthRefresh();
    } catch (error) {
      console.error('Recovery refresh failed:', error);
    } finally {
      if (componentMountedRef.current) {
        setIsRecovering(false);
      }
    }
  };

  // Show loading state while auth is being determined
  if (nexusData.authState.isAuthLoading) {
    return (
      <div className="liminal-logbook loading-state">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="text-text-secondary mb-4">Authenticating...</div>
            
            {/* Show recovery options after timeout */}
            {showStuckStateRecovery && (
              <div className="mt-6 p-4 bg-red-900/20 rounded border border-red-700/30">
                <div className="text-red-400 text-sm mb-3">
                  Authentication is taking longer than expected.
                </div>
                
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={handleRecoveryRefresh}
                    disabled={isRecovering}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm rounded transition-colors"
                  >
                    {isRecovering ? 'Refreshing...' : 'Retry'}
                  </button>
                  
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition-colors"
                  >
                    Refresh Page
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Show authentication panel if not authenticated
  if (!nexusData.authState.isAuthenticated) {
    return <AuthPanel onAuthSuccess={nexusData.forceAuthRefresh} />;
  }

  // Render the app if authenticated
  return <>{children}</>;
} 