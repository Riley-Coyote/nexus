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
  const [showEmergencyRecovery, setShowEmergencyRecovery] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [emergencyCountdown, setEmergencyCountdown] = useState(10);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const emergencyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const emergencyCountdownRef = useRef<NodeJS.Timeout | null>(null);
  const componentMountedRef = useRef(true);
  const authStartTimeRef = useRef<number>(Date.now());

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      componentMountedRef.current = false;
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      if (emergencyTimeoutRef.current) {
        clearTimeout(emergencyTimeoutRef.current);
      }
      if (emergencyCountdownRef.current) {
        clearTimeout(emergencyCountdownRef.current);
      }
    };
  }, []);

  // Recovery mechanism for stuck auth states
  useEffect(() => {
    if (nexusData.authState.isAuthLoading) {
      // Reset timer when auth loading starts
      authStartTimeRef.current = Date.now();
      
      // Clear any existing timeouts
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      if (emergencyTimeoutRef.current) {
        clearTimeout(emergencyTimeoutRef.current);
      }
      if (emergencyCountdownRef.current) {
        clearTimeout(emergencyCountdownRef.current);
      }
      
      // First timeout: Show retry button after 10 seconds
      loadingTimeoutRef.current = setTimeout(() => {
        if (componentMountedRef.current) {
          setShowStuckStateRecovery(true);
        }
      }, 10000);

      // Emergency timeout: Show page refresh option after 30 seconds
      emergencyTimeoutRef.current = setTimeout(() => {
        if (componentMountedRef.current) {
          console.warn('🚨 Auth stuck for 30+ seconds, showing emergency recovery');
          setShowEmergencyRecovery(true);
          setEmergencyCountdown(10);
          
          // Start countdown for automatic refresh
          const startCountdown = () => {
            const countdown = () => {
              setEmergencyCountdown(prev => {
                if (prev <= 1) {
                  console.warn('🚨 Emergency recovery: Force refreshing page');
                  window.location.reload();
                  return 0;
                }
                return prev - 1;
              });
            };
            
            emergencyCountdownRef.current = setTimeout(() => {
              countdown();
              // Continue countdown
              const countdownInterval = setInterval(() => {
                countdown();
                setEmergencyCountdown(prev => {
                  if (prev <= 1) {
                    clearInterval(countdownInterval);
                    return 0;
                  }
                  return prev - 1;
                });
              }, 1000);
            }, 1000);
          };
          
          startCountdown();
        }
      }, 30000);

    } else {
      // Clear timeouts if loading completes
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      if (emergencyTimeoutRef.current) {
        clearTimeout(emergencyTimeoutRef.current);
        emergencyTimeoutRef.current = null;
      }
      if (emergencyCountdownRef.current) {
        clearTimeout(emergencyCountdownRef.current);
        emergencyCountdownRef.current = null;
      }
      
      if (componentMountedRef.current) {
        setShowStuckStateRecovery(false);
        setShowEmergencyRecovery(false);
      }
    }
  }, [nexusData.authState.isAuthLoading]);

  const handleRecoveryRefresh = async () => {
    setIsRecovering(true);
    try {
      console.log('🔄 Attempting auth recovery...');
      
      // Clear any stuck localStorage data
      if (typeof window !== 'undefined') {
        const authKeys = Object.keys(localStorage).filter(key => 
          key.includes('supabase') || key.includes('auth') || key.includes('nexus')
        );
        console.log('🧹 Clearing auth keys:', authKeys);
        authKeys.forEach(key => {
          try {
            localStorage.removeItem(key);
          } catch (e) {
            console.warn('Failed to clear key:', key, e);
          }
        });
      }
      
      // Force auth refresh
      await nexusData.forceAuthRefresh();
      
      // If still stuck after 5 seconds, force page refresh
      setTimeout(() => {
        if (nexusData.authState.isAuthLoading) {
          console.warn('🚨 Auth still stuck after recovery, forcing page refresh');
          window.location.reload();
        }
      }, 5000);
      
    } catch (error) {
      console.error('Recovery refresh failed:', error);
      // Force page refresh as last resort
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } finally {
      if (componentMountedRef.current) {
        setIsRecovering(false);
      }
    }
  };

  const handleEmergencyRefresh = () => {
    console.log('🚨 Emergency refresh triggered by user');
    // Clear all timeouts
    if (emergencyCountdownRef.current) {
      clearTimeout(emergencyCountdownRef.current);
    }
    window.location.reload();
  };

  // Show loading state while auth is being determined
  if (nexusData.authState.isAuthLoading) {
    const loadingTime = Math.floor((Date.now() - authStartTimeRef.current) / 1000);
    
    return (
      <div className="liminal-logbook loading-state">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="text-text-secondary mb-4">
              Authenticating... ({loadingTime}s)
            </div>
            
            {/* Show retry options after timeout */}
            {showStuckStateRecovery && (
              <div className="mt-6 p-4 bg-amber-900/20 rounded border border-amber-700/30">
                <div className="text-amber-400 text-sm mb-3">
                  Authentication is taking longer than expected.
                </div>
                
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={handleRecoveryRefresh}
                    disabled={isRecovering}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm rounded transition-colors"
                  >
                    {isRecovering ? 'Recovering...' : 'Retry Auth'}
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

            {/* Emergency recovery after 30 seconds */}
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
                        clearTimeout(emergencyCountdownRef.current);
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