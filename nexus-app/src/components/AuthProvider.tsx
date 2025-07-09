'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import AuthPanel from './AuthPanel';

interface AuthProviderProps {
  children: React.ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const { isLoading, isAuthenticated, error, refreshAuth } = useAuth();
  const [showDebugOptions, setShowDebugOptions] = useState(false);

  // Show debug options after 5 seconds of loading
  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setShowDebugOptions(true);
      }, 5000);
      
      return () => clearTimeout(timer);
    } else {
      setShowDebugOptions(false);
    }
  }, [isLoading]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-deep-void">
        <div className="text-center">
          <div className="text-text-secondary mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-primary mx-auto"></div>
          </div>
          <div className="text-text-secondary text-sm mb-4">
            Authenticating...
          </div>
          <div className="text-text-tertiary text-xs mb-4">
            This should only take a few seconds
          </div>
          
          {showDebugOptions && (
            <div className="mt-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
              <div className="text-yellow-400 text-sm mb-3">Taking longer than expected?</div>
              <div className="space-y-2">
                <button
                  onClick={() => refreshAuth()}
                  className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                >
                  Force Refresh Auth
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="w-full px-3 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors"
                >
                  Reload Page
                </button>
              </div>
              <div className="text-text-tertiary text-xs mt-2">
                Check console for debug info
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-deep-void">
        <div className="text-center max-w-md p-6">
          <div className="text-red-400 mb-4 text-lg">Authentication Error</div>
          <div className="text-text-secondary text-sm mb-6">{error}</div>
          <div className="space-y-3">
            <button
              onClick={() => refreshAuth()}
              className="w-full px-4 py-2 bg-accent-primary text-white rounded-md hover:bg-accent-primary/80 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Refresh Page
            </button>
          </div>
          <div className="text-text-tertiary text-xs mt-4">
            If this problem persists, try clearing your browser cache
          </div>
        </div>
      </div>
    );
  }

  // Show authentication panel if not authenticated
  if (!isAuthenticated) {
    return <AuthPanel onAuthSuccess={() => {}} />;
  }

  // Render the app if authenticated
  return <>{children}</>;
} 