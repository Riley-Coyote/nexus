'use client';

import React, { useState, useRef } from 'react';
import { authService, AuthResult } from '../lib/services/supabaseAuthService';

interface AuthPanelProps {
  onAuthSuccess: () => void;
  onLogin?: () => void; // Add optional onLogin prop
  onSignup?: () => void; // Add optional onSignup prop
}

export default function AuthPanel({ onAuthSuccess, onLogin, onSignup }: AuthPanelProps) {
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]= useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [emailStatus, setEmailStatus] = useState<{
    checking: boolean;
    available: boolean | null;
    error?: string;
  }>({ checking: false, available: null });
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    name: ''
  });

  // Add ref to track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);
  const emailCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    return () => {
      isMountedRef.current = false;
      // Clear any pending email check timeout
      if (emailCheckTimeoutRef.current) {
        clearTimeout(emailCheckTimeoutRef.current);
      }
    };
  }, []);

  const safeSetState = (stateSetter: () => void) => {
    if (isMountedRef.current) {
      stateSetter();
    }
  };

  // Debounced email availability check
  const checkEmailAvailability = React.useCallback(async (email: string) => {
    // console.log('🚀 checkEmailAvailability called with:', email);
    
    // Clear any existing timeout
    if (emailCheckTimeoutRef.current) {
      // console.log('⏰ Clearing existing timeout');
      clearTimeout(emailCheckTimeoutRef.current);
    }

    // Don't check if email is empty or invalid format
    if (!email || !validateEmail(email)) {
      // console.log('❌ Email empty or invalid, clearing status');
      safeSetState(() => setEmailStatus({ checking: false, available: null }));
      return;
    }

    // Set checking state immediately
    // console.log('⏳ Setting checking state');
    safeSetState(() => setEmailStatus({ checking: true, available: null }));

    // Debounce the actual API call
    emailCheckTimeoutRef.current = setTimeout(async () => {
      try {
        // console.log('🔍 Checking username availability for:', email);
        const result = await authService.checkEmailAvailability(email);
        // console.log('✅ Username check result:', result);
        
        // Direct state update - React will handle if component is unmounted
        const newStatus = {
          checking: false,
          available: result.available,
          error: result.error
        };
        // console.log('🔄 Setting emailStatus to:', newStatus);
        setEmailStatus(newStatus);
              } catch (error) {
          // console.error('❌ Email check error:', error);
          
          setEmailStatus({
            checking: false,
            available: null,
            error: 'Failed to check email availability'
          });
      }
    }, 800); // 800ms debounce
  }, []);

  // Debug: Log when checkEmailAvailability changes
  React.useEffect(() => {
    // console.log('🔧 checkEmailAvailability function changed/created');
  }, [checkEmailAvailability]);

  // Clear username status when not in signup mode
  React.useEffect(() => {
    if (authMode !== 'signup') {
      // console.log('🧹 Clearing username status - not in signup mode');
      setEmailStatus({ checking: false, available: null });
    }
  }, [authMode]);

  // Debug: Log emailStatus changes
  React.useEffect(() => {
    // console.log('📊 emailStatus changed:', emailStatus);
  }, [emailStatus]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // console.log('📝 Input changed:', name, value);
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear messages when user starts typing
    if (error) setError(null);
    if (successMessage) setSuccessMessage(null);
    
    // Real-time password validation for signup mode
    if (name === 'password' && authMode === 'signup') {
      const validation = validatePassword(value);
      setPasswordErrors(validation.errors);
    }
    
    // Clear password errors when not in signup or when password is empty
    if (name === 'password' && (authMode !== 'signup' || value === '')) {
      setPasswordErrors([]);
    }
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // console.log('👁️ Input blur:', name, value);
    
    // Check email availability on blur for signup mode
    if (name === 'email' && authMode === 'signup' && value && validateEmail(value)) {
      // console.log('🎯 Triggering email check on blur');
      checkEmailAvailability(value);
    }
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (password.length < 12) {
      errors.push('Password must be at least 12 characters long');
    }
    
    if (password.length > 25) {
      errors.push('Password must be no more than 25 characters long');
    }
    
    if (!/(?=.*[0-9])/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  };

  // Add timeout wrapper for auth operations
  const withTimeout = async (promise: Promise<AuthResult>, timeoutMs: number = 30000): Promise<AuthResult> => {
    return Promise.race([
      promise,
      new Promise<AuthResult>((_, reject) => {
        setTimeout(() => reject(new Error('Operation timed out. Please check your connection and try again.')), timeoutMs);
      })
    ]);
  };

  // Check if submit should be disabled based on form validation
  const getSubmitDisabled = (): boolean => {
    // Always disabled if loading
    if (isLoading) return true;

    // For login and reset, only need username (can be username or email) and password
    if (authMode === 'login') {
      if (!formData.username || !formData.password) return true;
      return false;
    }
    
    if (authMode === 'reset') {
      if (!formData.username) return true;
      return false;
    }

    // For signup mode, check all required fields
    if (authMode === 'signup') {
      if (!formData.username) return true;
      if (!formData.email) return true;
      if (!formData.name) return true;
      if (!formData.password) return true;
      if (!formData.confirmPassword) return true;

      // Check email format
      if (!validateEmail(formData.email)) return true;
      
      // Check if email is still being checked
      if (emailStatus.checking) return true;
      
      // Check if email is unavailable
      if (emailStatus.available === false) return true;
      
      // Check password requirements
      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.isValid) return true;
      
      // Check if passwords match
      if (formData.password !== formData.confirmPassword) return true;
    }

    return false;
  };

  // Get the reason why submit is disabled
  const getSubmitDisabledReason = (): string => {
    if (!formData.username) return 'Please enter your username';
    
    if (authMode === 'login') {
      if (!formData.password) return 'Please enter your password';
      return 'Please complete all fields';
    }
    
    if (authMode === 'reset') {
      return 'Please enter your username';
    }
    
    if (authMode === 'signup') {
      if (!formData.email) return 'Please enter your email';
      if (!formData.name) return 'Please enter your name';
      if (!formData.password) return 'Please enter your password';
      if (!formData.confirmPassword) return 'Please confirm your password';
      
      if (!validateEmail(formData.email)) return 'Please enter a valid email address';
      
      if (emailStatus.checking) return 'Checking email availability...';
      if (emailStatus.available === false) return 'This email is already registered';
      
      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.isValid) {
        return `Password requirements: ${passwordValidation.errors[0]}`;
      }
      
      if (formData.password !== formData.confirmPassword) return 'Passwords do not match';
    }
    
    return 'Please complete all required fields';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent multiple simultaneous submissions
    if (isLoading) return;
    
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (authMode === 'reset') {
        // Validation for reset
        if (!validateEmail(formData.username)) {
          safeSetState(() => setError('Please enter a valid username'));
          return;
        }

        const result = await withTimeout(authService.resetPassword(formData.username));
        
        if (!isMountedRef.current) return;
        
        if (result.success) {
          safeSetState(() => {
            setSuccessMessage('Password reset email sent! Please check your inbox.');
            setAuthMode('login');
          });
        } else {
          safeSetState(() => setError(result.error || 'Failed to send password reset email'));
        }
        
      } else if (authMode === 'login') {
        // Validation for login
        if (!formData.username) {
          safeSetState(() => setError('Please enter your username or email'));
          return;
        }

        if (!formData.password) {
          safeSetState(() => setError('Please enter your password'));
          return;
        }

        const result = await withTimeout(authService.signIn(formData.username, formData.password));
        
        if (!isMountedRef.current) return;
        
        if (result.success) {
          // Success - component may unmount, so don't update state after this
          onAuthSuccess();
          if (onLogin) onLogin();
        } else if (result.needsVerification) {
          safeSetState(() => setSuccessMessage('Please check your email and verify your account before signing in.'));
        } else {
          safeSetState(() => setError(result.error || 'Login failed'));
        }
        
      } else {
        // Signup validation
        if (!formData.username) {
          safeSetState(() => setError('Please enter a username'));
          return;
        }

        if (!formData.email) {
          safeSetState(() => setError('Please enter your email'));
          return;
        }

        if (!validateEmail(formData.email)) {
          safeSetState(() => setError('Please enter a valid email address'));
          return;
        }

        if (!formData.name) {
          safeSetState(() => setError('Please enter your name'));
          return;
        }

        const passwordValidation = validatePassword(formData.password);
        if (!passwordValidation.isValid) {
          safeSetState(() => setError(passwordValidation.errors.join('. ')));
          return;
        }

        if (formData.password !== formData.confirmPassword) {
          safeSetState(() => setError('Passwords do not match'));
          return;
        }

        // Check email availability before proceeding
        if (emailStatus.available === false) {
          safeSetState(() => setError('This email is already registered. Please sign in instead.'));
          return;
        }

        // If we're still checking email availability, wait a moment
        if (emailStatus.checking) {
          safeSetState(() => setError('Still checking email availability. Please wait a moment.'));
          return;
        }
        
        const result = await withTimeout(authService.signUp(
          formData.email, 
          formData.password,
          { name: formData.name, username: formData.username }
        ));
        
        if (!isMountedRef.current) return;
        
        if (result.success) {
          if (result.needsVerification) {
            safeSetState(() => {
              setSuccessMessage('Account created! Please check your email and click the verification link to complete your signup.');
              setAuthMode('login');
            });
          } else {
            // Success - component may unmount, so don't update state after this
            onAuthSuccess();
            if (onSignup) onSignup();
          }
        } else {
          safeSetState(() => setError(result.error || 'Signup failed'));
        }
      }
    } catch (err) {
      // console.error('Auth error:', err);
      if (!isMountedRef.current) return;
      
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      safeSetState(() => setError(errorMessage));
    } finally {
      // Always reset loading state if component is still mounted
      safeSetState(() => setIsLoading(false));
    }
  };

  const switchAuthMode = (mode: 'login' | 'signup' | 'reset') => {
    // Prevent mode switching while loading
    if (isLoading) return;
    
    // Clear any pending email check
    if (emailCheckTimeoutRef.current) {
      clearTimeout(emailCheckTimeoutRef.current);
      emailCheckTimeoutRef.current = null;
    }
    
    setAuthMode(mode);
    setError(null);
    setSuccessMessage(null);
    setPasswordErrors([]);
    setEmailStatus({ checking: false, available: null });
    setFormData({
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      name: ''
    });
  };

  const resendVerification = async () => {
    if (!formData.username) {
      setError('Please enter your username');
      return;
    }

    if (isLoading) return; // Prevent multiple simultaneous requests
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await withTimeout(authService.resendVerification(formData.username));
      
      if (!isMountedRef.current) return;

      if (result.success) {
        safeSetState(() => setSuccessMessage('Verification email resent! Please check your inbox.'));
      } else {
        safeSetState(() => setError(result.error || 'Failed to resend verification email'));
      }
    } catch (err) {
      // console.error('Resend verification error:', err);
      if (!isMountedRef.current) return;
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to resend verification email';
      safeSetState(() => setError(errorMessage));
    } finally {
      safeSetState(() => setIsLoading(false));
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
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-200"
                placeholder="Enter your full name"
                required
                disabled={isLoading}
                maxLength={25}
              />
            </div>
          )}

          {/* Username */}
          <div className="space-y-2">
            <label htmlFor="username" className="block text-sm font-medium text-gray-300">
              Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-200"
              placeholder={authMode === 'signup' ? 'Choose a unique username' : 'Enter your username or email'}
              required
              disabled={isLoading}
              maxLength={25}
            />
          </div>

          {/* Email (signup only) */}
          {authMode === 'signup' && (
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onBlur={handleInputBlur}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 bg-black/20 border rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-200 ${
                    emailStatus.available === false
                      ? 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500/50'
                      : emailStatus.available === true
                      ? 'border-emerald-500/50'
                      : 'border-white/10'
                  }`}
                  placeholder="Enter your email address"
                  required
                  disabled={isLoading}
                />
                {/* Email availability icon */}
                {formData.email && validateEmail(formData.email) && (
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    {emailStatus.checking ? (
                      <div className="w-4 h-4 border-2 border-gray-400/30 border-t-gray-400 rounded-full animate-spin"></div>
                    ) : emailStatus.available === true ? (
                      <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : emailStatus.available === false ? (
                      <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    ) : null}
                  </div>
                )}
              </div>
              
              {/* Email availability message */}
              {formData.email && validateEmail(formData.email) && (
                <div className="text-xs">
                  {emailStatus.checking ? (
                    <p className="text-gray-400 flex items-center space-x-1">
                      <span>Checking availability...</span>
                    </p>
                  ) : emailStatus.available === true ? (
                    <p className="text-emerald-400 flex items-center space-x-1">
                      <span>✓</span>
                      <span>Email is available</span>
                    </p>
                  ) : emailStatus.available === false ? (
                    <p className="text-red-400 flex items-center space-x-1">
                      <span>✗</span>
                      <span>This email is already registered. Please sign in instead.</span>
                    </p>
                  ) : emailStatus.error ? (
                    <p className="text-yellow-400 flex items-center space-x-1">
                      <span>⚠</span>
                      <span>{emailStatus.error}</span>
                    </p>
                  ) : null}
                </div>
              )}
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
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-200"
                placeholder={authMode === 'signup' ? 'Create a strong password (12-25 characters)' : 'Enter your password'}
                required
                disabled={isLoading}
                minLength={authMode === 'signup' ? 12 : 6}
                maxLength={25}
              />
              
              {/* Password Requirements (signup only) */}
              {authMode === 'signup' && (
                <div className="text-xs space-y-1">
                  <p className="text-gray-400 font-medium">Password Requirements:</p>
                  <ul className="space-y-1">
                    <li className={`flex items-center space-x-2 ${
                      formData.password.length >= 12 && formData.password.length <= 25 ? 'text-emerald-400' : 'text-gray-500'
                    }`}>
                      <span>{formData.password.length >= 12 && formData.password.length <= 25 ? '✓' : '•'}</span>
                      <span>12-25 characters</span>
                    </li>
                    <li className={`flex items-center space-x-2 ${
                      /(?=.*[0-9])/.test(formData.password) ? 'text-emerald-400' : 'text-gray-500'
                    }`}>
                      <span>{/(?=.*[0-9])/.test(formData.password) ? '✓' : '•'}</span>
                      <span>At least one number</span>
                    </li>
                    <li className={`flex items-center space-x-2 ${
                      /(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(formData.password) ? 'text-emerald-400' : 'text-gray-500'
                    }`}>
                      <span>{/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(formData.password) ? '✓' : '•'}</span>
                      <span>At least one special character (!@#$%^&* etc.)</span>
                    </li>
                  </ul>
                </div>
              )}
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
                maxLength={25}
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
                  className="mt-2 text-xs text-emerald-400 hover:text-emerald-300 underline disabled:opacity-50"
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
            disabled={isLoading || getSubmitDisabled()}
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
          
          {/* Submit Button Helper Text */}
          {getSubmitDisabled() && !isLoading && (
            <div className="text-xs text-gray-400 text-center">
              {getSubmitDisabledReason()}
            </div>
          )}

          {/* Footer Links */}
          {authMode === 'login' && (
            <div className="text-center space-y-2">
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
