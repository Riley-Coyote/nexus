'use client';

import React, { useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';

interface AuthPanelProps {
  onAuthSuccess: () => void;
  onLogin?: () => void;
  onSignup?: () => void;
}

export default function AuthPanel({ onAuthSuccess, onLogin, onSignup }: AuthPanelProps) {
  const searchParams = useSearchParams();
  const { signIn, signUp } = useAuth();
  
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    name: ''
  });

  // Add ref to track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);

  React.useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Handle URL parameters for auth mode and success messages
  React.useEffect(() => {
    const tab = searchParams.get('tab');
    const message = searchParams.get('message');
    
    if (tab === 'signin') {
      setAuthMode('login');
      
      if (message === 'password_updated') {
        setSuccessMessage('Password updated successfully! Please sign in with your new password.');
        
        // Clean up URL parameters after showing the message
        const url = new URL(window.location.href);
        url.searchParams.delete('tab');
        url.searchParams.delete('message');
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [searchParams]);

  const safeSetState = (stateSetter: () => void) => {
    if (isMountedRef.current) {
      stateSetter();
    }
  };

  // Simple validation helpers
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    const errors = [];
    if (password.length < 8) errors.push('At least 8 characters');
    if (!/[A-Z]/.test(password)) errors.push('One uppercase letter');
    if (!/[a-z]/.test(password)) errors.push('One lowercase letter');
    if (!/[0-9]/.test(password)) errors.push('One number');
    
    return { isValid: errors.length === 0, errors };
  };

  // Check if submit should be disabled based on form validation
  const getSubmitDisabled = (): boolean => {
    if (isLoading) return true;

    if (authMode === 'login') {
      return !formData.username || !formData.password;
    }
    
    if (authMode === 'reset') {
      return !formData.username || !validateEmail(formData.username);
    }

    if (authMode === 'signup') {
      if (!formData.username || !formData.email || !formData.name || 
          !formData.password || !formData.confirmPassword) {
        return true;
      }

      if (!validateEmail(formData.email)) return true;
      
      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.isValid) return true;
      
      if (formData.password !== formData.confirmPassword) return true;
    }

    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (getSubmitDisabled()) return;
    
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (authMode === 'login') {
        // Validation for login
        if (!formData.username) {
          setError('Please enter your username or email');
          setIsLoading(false);
          return;
        }

        if (!formData.password) {
          setError('Please enter your password');
          setIsLoading(false);
          return;
        }

        const result = await signIn(formData.username, formData.password);
        
        if (!isMountedRef.current) return;
        
        if (result.success) {
          try {
            await onAuthSuccess();
          } catch (error) {
            console.error('Auth success callback failed:', error);
          }
          if (onLogin) onLogin();
        } else {
          safeSetState(() => setError(result.error || 'Login failed'));
        }
        
      } else if (authMode === 'signup') {
        // Validation for signup
        if (!formData.username || !formData.email || !formData.name || 
            !formData.password || !formData.confirmPassword) {
          setError('Please fill in all fields');
          setIsLoading(false);
          return;
        }

        if (!validateEmail(formData.email)) {
          setError('Please enter a valid email address');
          setIsLoading(false);
          return;
        }

        const passwordValidation = validatePassword(formData.password);
        if (!passwordValidation.isValid) {
          setError(`Password must have: ${passwordValidation.errors.join(', ')}`);
          setIsLoading(false);
          return;
        }

        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match');
          setIsLoading(false);
          return;
        }

        const result = await signUp(formData.email, formData.password, {
          name: formData.name,
          username: formData.username
        });
        
        if (!isMountedRef.current) return;
        
        if (result.success) {
          if (result.needsVerification) {
            safeSetState(() => {
              setSuccessMessage('Account created! Please check your email and click the verification link to complete your signup.');
              setAuthMode('login');
            });
          } else {
            try {
              await onAuthSuccess();
            } catch (error) {
              console.error('Auth success callback failed:', error);
            }
            if (onSignup) onSignup();
          }
        } else {
          safeSetState(() => setError(result.error || 'Signup failed'));
        }
      } else if (authMode === 'reset') {
        // Reset password functionality would go here
        safeSetState(() => setError('Password reset not yet implemented'));
      }
    } catch (err) {
      console.error('Auth error:', err);
      if (!isMountedRef.current) return;
      
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      safeSetState(() => setError(errorMessage));
    } finally {
      setIsLoading(false);
    }
  };

  const switchAuthMode = (mode: 'login' | 'signup' | 'reset') => {
    if (isLoading) return;
    
    setAuthMode(mode);
    setError(null);
    setSuccessMessage(null);
    setFormData({
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      name: ''
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
    if (successMessage) setSuccessMessage(null);
  };

  return (
    <div className="min-h-screen bg-deep-void flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-surface-primary/10 backdrop-blur-sm border border-white/10 rounded-2xl p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-light text-text-primary mb-2">NEXUS</h1>
            <p className="text-text-secondary text-sm">
              Collective Intelligence Research Network
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex rounded-lg bg-surface-secondary/20 p-1 mb-6">
            <button
              onClick={() => switchAuthMode('login')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                authMode === 'login'
                  ? 'bg-accent-primary text-white'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => switchAuthMode('signup')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                authMode === 'signup'
                  ? 'bg-accent-primary text-white'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-green-400 text-sm">{successMessage}</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {authMode === 'signup' && (
              <>
                <div>
                  <label className="block text-text-secondary text-sm mb-2">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full px-3 py-2 bg-surface-secondary/20 border border-white/10 rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent-primary transition-colors"
                    placeholder="Your full name"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block text-text-secondary text-sm mb-2">Username</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    className="w-full px-3 py-2 bg-surface-secondary/20 border border-white/10 rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent-primary transition-colors"
                    placeholder="Choose a username"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block text-text-secondary text-sm mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full px-3 py-2 bg-surface-secondary/20 border border-white/10 rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent-primary transition-colors"
                    placeholder="your.email@example.com"
                    disabled={isLoading}
                  />
                </div>
              </>
            )}

            {authMode === 'login' && (
              <div>
                <label className="block text-text-secondary text-sm mb-2">Email or Username</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  className="w-full px-3 py-2 bg-surface-secondary/20 border border-white/10 rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent-primary transition-colors"
                  placeholder="your.email@example.com"
                  disabled={isLoading}
                />
              </div>
            )}

            {authMode === 'reset' && (
              <div>
                <label className="block text-text-secondary text-sm mb-2">Email</label>
                <input
                  type="email"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  className="w-full px-3 py-2 bg-surface-secondary/20 border border-white/10 rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent-primary transition-colors"
                  placeholder="your.email@example.com"
                  disabled={isLoading}
                />
              </div>
            )}

            {(authMode === 'login' || authMode === 'signup') && (
              <div>
                <label className="block text-text-secondary text-sm mb-2">Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="w-full px-3 py-2 bg-surface-secondary/20 border border-white/10 rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent-primary transition-colors"
                  placeholder="Enter your password"
                  disabled={isLoading}
                />
              </div>
            )}

            {authMode === 'signup' && (
              <div>
                <label className="block text-text-secondary text-sm mb-2">Confirm Password</label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  className="w-full px-3 py-2 bg-surface-secondary/20 border border-white/10 rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent-primary transition-colors"
                  placeholder="Confirm your password"
                  disabled={isLoading}
                />
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={getSubmitDisabled()}
              className="w-full py-3 mt-6 bg-accent-primary hover:bg-accent-primary/80 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {authMode === 'login' ? 'Signing In...' : authMode === 'signup' ? 'Creating Account...' : 'Sending Reset Email...'}
                </div>
              ) : (
                authMode === 'login' ? 'Sign In' : authMode === 'signup' ? 'Create Account' : 'Send Reset Email'
              )}
            </button>
          </form>

          {/* Footer Links */}
          <div className="mt-6 text-center">
            {authMode !== 'reset' && (
              <button
                onClick={() => switchAuthMode('reset')}
                className="text-text-tertiary hover:text-text-secondary text-sm transition-colors"
                disabled={isLoading}
              >
                Forgot your password?
              </button>
            )}
            {authMode === 'reset' && (
              <button
                onClick={() => switchAuthMode('login')}
                className="text-text-tertiary hover:text-text-secondary text-sm transition-colors"
                disabled={isLoading}
              >
                Back to Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
