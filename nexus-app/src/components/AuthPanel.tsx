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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 p-8 bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center">
            <span className="text-2xl">◉</span>
          </div>
          <h2 className="text-2xl font-light mb-3 tracking-wide text-gray-100">
            {authMode === 'reset' ? 'Reset Password' : 'Welcome to NEXUS'}
          </h2>
          <p className="text-sm text-gray-400 font-light">
            {authMode === 'reset' 
              ? 'Enter your email address and we\'ll send you a password reset link if your account exists'
              : authMode === 'signup'
              ? 'Create your account to join the collective intelligence'
              : 'Sign in to continue your journey'
            }
          </p>
        </div>

        {/* Auth Mode Toggle */}
        {authMode !== 'reset' && (
          <div className="mb-6">
            <div className="flex rounded-xl bg-black/20 p-1">
              <button
                type="button"
                onClick={() => switchAuthMode('login')}
                disabled={isLoading}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-lg transition-all duration-300 disabled:opacity-50 ${
                  authMode === 'login'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => switchAuthMode('signup')}
                disabled={isLoading}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-lg transition-all duration-300 disabled:opacity-50 ${
                  authMode === 'signup'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                Sign Up
              </button>
            </div>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
            <p className="text-sm text-emerald-400">{successMessage}</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name (signup only) */}
          {authMode === 'signup' && (
            <div className="space-y-2">
              <label htmlFor="name" className="block text-sm font-medium text-gray-300">
                Name
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-200"
                placeholder="Enter your full name"
                disabled={isLoading}
              />
            </div>
          )}

          {/* Username/Email for login and reset */}
          <div className="space-y-2">
            <label htmlFor="username" className="block text-sm font-medium text-gray-300">
              {authMode === 'reset' ? 'Email Address' : authMode === 'signup' ? 'Username' : 'Email or Username'}
            </label>
            <input
              type={authMode === 'reset' ? 'email' : 'text'}
              id="username"
              value={formData.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-200"
              placeholder={authMode === 'signup' ? 'Choose a unique username' : authMode === 'reset' ? 'Enter your email address' : 'Enter your username or email'}
              disabled={isLoading}
            />
          </div>

          {/* Email (signup only) */}
          {authMode === 'signup' && (
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-200"
                placeholder="Enter your email address"
                disabled={isLoading}
              />
            </div>
          )}

          {/* Password (not for reset) */}
          {authMode !== 'reset' && (
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-200"
                placeholder={authMode === 'signup' ? 'Create a strong password' : 'Enter your password'}
                disabled={isLoading}
              />
            </div>
          )}

          {/* Confirm Password (signup only) */}
          {authMode === 'signup' && (
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300">
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-200"
                placeholder="Confirm your password"
                disabled={isLoading}
              />
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={getSubmitDisabled()}
            className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500/20 to-purple-500/20 border border-emerald-500/30 text-emerald-400 rounded-lg font-medium transition-all duration-300 hover:from-emerald-500/30 hover:to-purple-500/30 hover:border-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin"></div>
                <span>
                  {authMode === 'reset' ? 'Sending...' : authMode === 'login' ? 'Signing In...' : 'Creating Account...'}
                </span>
              </div>
            ) : (
              authMode === 'reset' ? 'Send Reset Link' : authMode === 'login' ? 'Sign In' : 'Create Account'
            )}
          </button>

          {/* Footer Links */}
          {authMode === 'login' && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => switchAuthMode('reset')}
                disabled={isLoading}
                className="text-sm text-gray-400 hover:text-gray-300 underline disabled:opacity-50"
              >
                Forgot your password?
              </button>
            </div>
          )}

          {authMode === 'reset' && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => switchAuthMode('login')}
                disabled={isLoading}
                className="text-sm text-gray-400 hover:text-gray-300 underline disabled:opacity-50"
              >
                Back to sign in
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
