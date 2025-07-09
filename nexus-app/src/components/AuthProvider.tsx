'use client';

import React from 'react';
import AuthPanel from './AuthPanel';
import { useAuth } from '@/hooks/useAuth';

interface AuthProviderProps {
  children: React.ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const { user, isAuthenticated, isLoading } = useAuth();

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