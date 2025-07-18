'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
}

export default function ProfileModal({ isOpen, onClose, user }: ProfileModalProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'account'>('profile');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({ ...prev, [name]: value }));
    if (error) setError(null);
    if (successMessage) setSuccessMessage(null);
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

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLoading) return;
    
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Validate required fields
      if (!passwordForm.oldPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
        setError('Please fill in all fields');
        return;
      }

      // Validate new password requirements
      const passwordValidation = validatePassword(passwordForm.newPassword);
      if (!passwordValidation.isValid) {
        setError(passwordValidation.errors.join('. '));
        return;
      }

      // Check if passwords match
      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        setError('New passwords do not match');
        return;
      }

      // Update password using Supabase client
      const { data, error: updateError } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });

      if (updateError) {
        setError(updateError.message || 'Failed to update password');
        return;
      }

      setSuccessMessage('Password updated successfully!');
      
      // Clear form
      setPasswordForm({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      // Auto-close change password form after success
      setTimeout(() => {
        setShowChangePassword(false);
        setSuccessMessage(null);
      }, 2000);

    } catch (err) {
      console.error('Password update error:', err);
      setError('Failed to update password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-settings-title"
    >
      <div className="w-full max-w-2xl mx-4 bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 id="profile-settings-title" className="text-xl font-light text-gray-100">Profile Settings</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-300 rounded-lg hover:bg-white/5 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === 'profile'
                ? 'text-emerald-400 border-b-2 border-emerald-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveTab('account')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === 'account'
                ? 'text-emerald-400 border-b-2 border-emerald-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Account Settings
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'profile' ? (
            <div className="space-y-6">
              {/* Profile Info */}
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-100">{user?.name}</h3>
                <p className="text-sm text-gray-400">{user?.email}</p>
                <p className="text-xs text-gray-500 mt-1">@{user?.username}</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-black/20 rounded-lg">
                  <div className="text-lg font-semibold text-emerald-400">{user?.stats?.entries || 0}</div>
                  <div className="text-xs text-gray-400">Entries</div>
                </div>
                <div className="p-3 bg-black/20 rounded-lg">
                  <div className="text-lg font-semibold text-purple-400">{user?.stats?.dreams || 0}</div>
                  <div className="text-xs text-gray-400">Dreams</div>
                </div>
                <div className="p-3 bg-black/20 rounded-lg">
                  <div className="text-lg font-semibold text-blue-400">{user?.stats?.connections || 0}</div>
                  <div className="text-xs text-gray-400">Connections</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Account Settings */}
              <div>
                <h3 className="text-lg font-medium text-gray-100 mb-4">Account Settings</h3>
                
                {!showChangePassword ? (
                  <div className="space-y-3">
                    <button
                      onClick={() => setShowChangePassword(true)}
                      className="w-full flex items-center justify-between p-4 bg-black/20 rounded-lg hover:bg-black/30 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                          <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                        <div className="text-left">
                          <div className="font-medium text-gray-100">Change Password</div>
                          <div className="text-sm text-gray-400">Update your account password</div>
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Change Password Form */}
                    <div className="flex items-center space-x-2 mb-4">
                      <button
                        onClick={() => {
                          setShowChangePassword(false);
                          setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
                          setError(null);
                          setSuccessMessage(null);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-300"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <h4 className="text-lg font-medium text-gray-100">Change Password</h4>
                    </div>

                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                      {/* Current Password */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Current Password</label>
                        <input
                          type="password"
                          name="oldPassword"
                          value={passwordForm.oldPassword}
                          onChange={handlePasswordChange}
                          className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                          placeholder="Enter your current password"
                          required
                          disabled={isLoading}
                        />
                      </div>

                      {/* New Password */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">New Password</label>
                        <input
                          type="password"
                          name="newPassword"
                          value={passwordForm.newPassword}
                          onChange={handlePasswordChange}
                          className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                          placeholder="Enter your new password"
                          required
                          disabled={isLoading}
                        />
                      </div>

                      {/* Confirm Password */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Confirm New Password</label>
                        <input
                          type="password"
                          name="confirmPassword"
                          value={passwordForm.confirmPassword}
                          onChange={handlePasswordChange}
                          className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                          placeholder="Confirm your new password"
                          required
                          disabled={isLoading}
                        />
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
                        className="w-full py-2 px-4 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-lg font-medium hover:bg-emerald-500/30 disabled:opacity-50 transition-colors"
                      >
                        {isLoading ? 'Updating...' : 'Update Password'}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 