'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authService } from '@/lib/services/supabaseAuthService';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isMagicLinkFlow, setIsMagicLinkFlow] = useState(false);
  const [formData, setFormData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Safe state setter to prevent updates after unmount
  const safeSetState = (stateSetter: () => void) => {
    if (isMountedRef.current) {
      stateSetter();
    }
  };

  // Check if user came from magic link (forgot password flow)
  useEffect(() => {
    const checkMagicLinkFlow = () => {
      // Check URL hash for access_token (indicates magic link)
      const hash = window.location.hash;
      const hasAccessToken = hash.includes('access_token=');
      
      // Check URL search params for type=recovery
      const type = searchParams.get('type');
      const isRecovery = type === 'recovery';
      
      if (hasAccessToken || isRecovery) {
        setIsMagicLinkFlow(true);
      }
    };

    checkMagicLinkFlow();
  }, [searchParams]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear messages when user starts typing
    if (error) safeSetState(() => setError(null));
    if (successMessage) safeSetState(() => setSuccessMessage(null));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLoading) return;
    
    setIsLoading(true);
    safeSetState(() => setError(null));
    safeSetState(() => setSuccessMessage(null));

    try {
      // Validate new password
      if (!formData.newPassword) {
        setError('Please enter your new password');
        setIsLoading(false);
        return;
      }

      if (!formData.confirmPassword) {
        setError('Please confirm your new password');
        setIsLoading(false);
        return;
      }

      // For traditional flow, validate old password
      if (!isMagicLinkFlow && !formData.oldPassword) {
        setError('Please enter your current password');
        setIsLoading(false);
        return;
      }

      // Validate new password requirements
      const passwordValidation = validatePassword(formData.newPassword);
      if (!passwordValidation.isValid) {
        setError(passwordValidation.errors.join('. '));
        setIsLoading(false);
        return;
      }

      // Check if passwords match
      if (formData.newPassword !== formData.confirmPassword) {
        setError('New passwords do not match');
        setIsLoading(false);
        return;
      }

      if (isMagicLinkFlow) {
        // Magic link flow - user is already authenticated via magic link
        const { error: updateError } = await supabase.auth.updateUser({
          password: formData.newPassword
        });

        if (updateError) {
          setError(updateError.message || 'Failed to update password');
          setIsLoading(false);
          return;
        }

        // Password update successful - immediately stop loading and redirect
        setIsLoading(false);
        setSuccessMessage('Password set successfully! Redirecting...');
        
        // Clear form
        setFormData({
          oldPassword: '',
          newPassword: '',
          confirmPassword: ''
        });

        // Use a more reliable redirect approach
        setTimeout(() => {
          if (isMountedRef.current) {
            // Sign out in the background and redirect immediately
            supabase.auth.signOut().catch(console.error);
            router.replace('/?tab=signin&message=password_updated');
          }
        }, 500);
        
        return;
      } else {
        // Traditional flow - verify old password first
        const currentUser = authService.getCurrentUser();
        if (!currentUser) {
          setError('You must be signed in to change your password');
          setIsLoading(false);
          return;
        }

        const result = await authService.updatePasswordSecure(
          formData.oldPassword,
          formData.newPassword
        );

        if (!result.success) {
          setError(result.error || 'Failed to update password');
          setIsLoading(false);
          return;
        }

        // Password update successful - immediately stop loading and redirect
        setIsLoading(false);
        setSuccessMessage('Password updated successfully! Redirecting...');
        
        // Clear form
        setFormData({
          oldPassword: '',
          newPassword: '',
          confirmPassword: ''
        });

        // Use a more reliable redirect approach
        setTimeout(() => {
          if (isMountedRef.current) {
            // Sign out in the background and redirect immediately
            authService.signOut();
            router.replace('/?tab=signin&message=password_updated');
          }
        }, 500);
        
        return;
      }

    } catch (err) {
      console.error('Password update error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update password';
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-2xl p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center">
              <span className="text-2xl">🔒</span>
            </div>
            <h1 className="text-2xl font-light mb-3 tracking-wide text-gray-100">
              {isMagicLinkFlow ? 'Set New Password' : 'Reset Your Password'}
            </h1>
            <p className="text-sm text-gray-400 font-light">
              {isMagicLinkFlow 
                ? 'Choose a new password for your account'
                : 'Enter your current password and choose a new one'
              }
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Current Password - Only show for traditional flow */}
            {!isMagicLinkFlow && (
              <div className="space-y-2">
                <label htmlFor="oldPassword" className="block text-sm font-medium text-gray-300">
                  Current Password
                </label>
                <input
                  type="password"
                  id="oldPassword"
                  name="oldPassword"
                  value={formData.oldPassword}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-200"
                  placeholder="Enter your current password"
                  required
                  disabled={isLoading}
                />
              </div>
            )}

            {/* New Password */}
            <div className="space-y-2">
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-300">
                New Password
              </label>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-200"
                placeholder="Enter your new password"
                required
                disabled={isLoading}
                minLength={12}
                maxLength={25}
              />
              
              {/* Password Requirements */}
              <div className="text-xs space-y-1">
                <p className="text-gray-400 font-medium">Password Requirements:</p>
                <ul className="space-y-1">
                  <li className={`flex items-center space-x-2 ${
                    formData.newPassword.length >= 12 && formData.newPassword.length <= 25 ? 'text-emerald-400' : 'text-gray-500'
                  }`}>
                    <span>{formData.newPassword.length >= 12 && formData.newPassword.length <= 25 ? '✓' : '•'}</span>
                    <span>12-25 characters</span>
                  </li>
                  <li className={`flex items-center space-x-2 ${
                    /(?=.*[0-9])/.test(formData.newPassword) ? 'text-emerald-400' : 'text-gray-500'
                  }`}>
                    <span>{/(?=.*[0-9])/.test(formData.newPassword) ? '✓' : '•'}</span>
                    <span>At least one number</span>
                  </li>
                  <li className={`flex items-center space-x-2 ${
                    /(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(formData.newPassword) ? 'text-emerald-400' : 'text-gray-500'
                  }`}>
                    <span>{/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(formData.newPassword) ? '✓' : '•'}</span>
                    <span>At least one special character</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300">
                Confirm New Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-200"
                placeholder="Confirm your new password"
                required
                disabled={isLoading}
                minLength={12}
                maxLength={25}
              />
              
              {/* Password Match Indicator */}
              {formData.confirmPassword && (
                <div className="text-xs">
                  {formData.newPassword === formData.confirmPassword ? (
                    <p className="text-emerald-400 flex items-center space-x-1">
                      <span>✓</span>
                      <span>Passwords match</span>
                    </p>
                  ) : (
                    <p className="text-red-400 flex items-center space-x-1">
                      <span>✗</span>
                      <span>Passwords do not match</span>
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm text-red-400">{error}</p>
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
                  <span>{isMagicLinkFlow ? 'Setting Password...' : 'Updating Password...'}</span>
                </div>
              ) : (
                isMagicLinkFlow ? 'Set Password' : 'Update Password'
              )}
            </button>

            {/* Back Link */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => router.push('/')}
                disabled={isLoading}
                className="text-sm text-gray-400 hover:text-gray-300 underline disabled:opacity-50"
              >
                Back to Home
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 