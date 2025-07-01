'use client';

import React, { useState } from 'react';
import { authService } from '../lib/services/supabaseAuthService';

interface AuthPanelProps {
  onAuthSuccess: () => void;
  onLogin?: () => void; // Add optional onLogin prop
  onSignup?: () => void; // Add optional onSignup prop
}

export default function AuthPanel({ onAuthSuccess, onLogin, onSignup }: AuthPanelProps) {
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear messages when user starts typing
    if (error) setError(null);
    if (successMessage) setSuccessMessage(null);
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): boolean => {
    return password.length >= 6;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (authMode === 'reset') {
        if (!validateEmail(formData.email)) {
          setError('Please enter a valid email address');
          setIsLoading(false);
          return;
        }

        const result = await authService.resetPassword(formData.email);
        if (result.success) {
          setSuccessMessage('Password reset email sent! Please check your inbox.');
          setAuthMode('login');
        } else {
          setError(result.error || 'Failed to send password reset email');
        }
      } else if (authMode === 'login') {
        if (!validateEmail(formData.email)) {
          setError('Please enter a valid email address');
          setIsLoading(false);
          return;
        }

        if (!formData.password) {
          setError('Please enter your password');
          setIsLoading(false);
          return;
        }

        const result = await authService.signIn(formData.email, formData.password);
        if (result.success) {
          onAuthSuccess();
          if (onLogin) onLogin(); // Call onLogin if provided
        } else if (result.needsVerification) {
          setSuccessMessage('Please check your email and verify your account before signing in.');
        } else {
          setError(result.error || 'Login failed');
        }
      } else {
        // Signup validation
        if (!validateEmail(formData.email)) {
          setError('Please enter a valid email address');
          setIsLoading(false);
          return;
        }

        if (!validatePassword(formData.password)) {
          setError('Password must be at least 6 characters long');
          setIsLoading(false);
          return;
        }

        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match');
          setIsLoading(false);
          return;
        }
        
        const result = await authService.signUp(
          formData.email, 
          formData.password,
          { name: formData.name || formData.email.split('@')[0] }
        );
        
        if (result.success) {
          if (result.needsVerification) {
            setSuccessMessage('Account created! Please check your email and click the verification link to complete your signup.');
            setAuthMode('login');
          } else {
            onAuthSuccess();
            if (onSignup) onSignup(); // Call onSignup if provided
          }
        } else {
          setError(result.error || 'Signup failed');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const switchAuthMode = (mode: 'login' | 'signup' | 'reset') => {
    setAuthMode(mode);
    setError(null);
    setSuccessMessage(null);
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      name: ''
    });
  };

  const resendVerification = async () => {
    if (!formData.email) {
      setError('Please enter your email address');
      return;
    }

    setIsLoading(true);
    const result = await authService.resendVerification(formData.email);
    setIsLoading(false);

    if (result.success) {
      setSuccessMessage('Verification email resent! Please check your inbox.');
    } else {
      setError(result.error || 'Failed to resend verification email');
    }
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
              ? 'Enter your email to receive a password reset link'
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
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-lg transition-all duration-300 ${
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
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-lg transition-all duration-300 ${
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name (signup only) */}
          {authMode === 'signup' && (
            <div className="space-y-2">
              <label htmlFor="name" className="block text-sm font-medium text-gray-300">
                Name (optional)
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-200"
                placeholder="Enter your name"
                disabled={isLoading}
              />
            </div>
          )}

          {/* Email */}
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-gray-300">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-200"
              placeholder="Enter your email"
              required
              disabled={isLoading}
            />
          </div>

          {/* Password (not for reset) */}
          {authMode !== 'reset' && (
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-200"
                placeholder={authMode === 'signup' ? 'Create a password (min 6 characters)' : 'Enter your password'}
                required
                disabled={isLoading}
                minLength={6}
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
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-200"
                placeholder="Confirm your password"
                required
                disabled={isLoading}
                minLength={6}
              />
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
              {error.includes('verify') && (
                <button
                  type="button"
                  onClick={resendVerification}
                  disabled={isLoading}
                  className="mt-2 text-xs text-emerald-400 hover:text-emerald-300 underline"
                >
                  Resend verification email
                </button>
              )}
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <p className="text-sm text-emerald-400">{successMessage}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
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
            <div className="text-center space-y-2">
              <button
                type="button"
                onClick={() => switchAuthMode('reset')}
                className="text-sm text-gray-400 hover:text-gray-300 underline"
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
                className="text-sm text-gray-400 hover:text-gray-300 underline"
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
