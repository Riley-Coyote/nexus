'use client';

import React, { useState } from 'react';
import AuthPanel from '@/components/AuthPanel';
import { useNexusData } from '@/hooks/useNexusData';

interface AuthProviderProps {
  children: React.ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const nexusData = useNexusData();

  const handleAuthSuccess = () => {
    // Force a re-check of auth state to trigger re-render
    nexusData.forceAuthRefresh();
  };

  // Show loading state while auth is being determined
  if (nexusData.authState.isAuthLoading) {
    return (
      <div className="liminal-logbook loading-state">
        <div className="flex items-center justify-center h-screen">
          <div className="text-text-secondary">Authenticating...</div>
        </div>
      </div>
    );
  }

  // Show auth panel if not authenticated
  if (!nexusData.authState.isAuthenticated) {
    return <AuthPanel onAuthSuccess={handleAuthSuccess} />;
  }

  // Show loading state while initial data is being fetched
  if (nexusData.isLoading) {
    return (
      <div className="liminal-logbook loading-state">
        <div className="flex items-center justify-center h-screen">
          <div className="text-text-secondary">Loading Nexus...</div>
        </div>
      </div>
    );
  }

  // User is authenticated and data is loaded - render the app
  return <>{children}</>;
} 