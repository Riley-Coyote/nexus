'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/supabase';
import { User } from '@/lib/types';

interface UserProfileProps {
  user: User;
  onLogout: () => void;
  onViewProfile: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function UserProfile({ user, onLogout, onViewProfile, isOpen, onClose }: UserProfileProps) {
  const { signOut } = useAuth();
  const modalRef = useRef<HTMLDivElement>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'account'>('profile');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // Handle clicking outside to close modal
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

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

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
    
    // Clear messages when user starts typing
    if (passwordMessage) setPasswordMessage(null);
    
    // Real-time validation for new password
    if (name === 'newPassword') {
      const validation = validatePassword(value);
      setPasswordErrors(validation.errors);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isUpdatingPassword) return;
    
    // Validation
    if (!passwordData.currentPassword) {
      setPasswordMessage({ type: 'error', text: 'Please enter your current password' });
      return;
    }
    
    if (!passwordData.newPassword) {
      setPasswordMessage({ type: 'error', text: 'Please enter a new password' });
      return;
    }
    
    if (!passwordData.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Please confirm your new password' });
      return;
    }
    
    const passwordValidation = validatePassword(passwordData.newPassword);
    if (!passwordValidation.isValid) {
      setPasswordMessage({ type: 'error', text: passwordValidation.errors[0] });
      return;
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    
    setIsUpdatingPassword(true);
    
    try {
      // Update password using Supabase directly
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });
      
      if (!error) {
        setPasswordMessage({ type: 'success', text: 'Password updated successfully!' });
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setPasswordErrors([]);
        setShowChangePassword(false);
        // Auto-close success message after 3 seconds
        setTimeout(() => setPasswordMessage(null), 3000);
      } else {
        setPasswordMessage({ type: 'error', text: error.message || 'Failed to update password' });
      }
    } catch (error) {
      console.error('Password update error:', error);
      setPasswordMessage({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleLogout = () => {
    signOut();
    onLogout();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
    >
      <div ref={modalRef} className="w-full max-w-2xl mx-4 bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 id="profile-modal-title" className="text-xl font-light text-gray-100">Profile Settings</h2>
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
                {/* Banner Image */}
                {user?.bannerImage && (
                  <div className="w-full h-24 mb-4 rounded-lg overflow-hidden bg-gradient-to-br from-emerald-500/20 to-purple-500/20 border border-white/10">
                    <img 
                      src={user.bannerImage} 
                      alt={`${user.name}'s banner`} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                {/* Profile Picture */}
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center">
                  {user?.profileImage ? (
                    <img 
                      src={user.profileImage} 
                      alt={user.name} 
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <span className="text-2xl font-bold text-gray-100">
                      {user?.avatar || user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-medium text-gray-100">{user?.name}</h3>
                <p className="text-sm text-gray-400">{user?.email}</p>
                <p className="text-xs text-gray-500 mt-1">@{user?.username}</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-black/20 rounded-lg border border-white/5">
                  <div className="text-lg font-semibold text-emerald-400">{user?.stats?.entries || 0}</div>
                  <div className="text-xs text-gray-400">Entries</div>
                </div>
                <div className="text-center p-3 bg-black/20 rounded-lg border border-white/5">
                  <div className="text-lg font-semibold text-purple-400">{user?.stats?.dreams || 0}</div>
                  <div className="text-xs text-gray-400">Dreams</div>
                </div>
                <div className="relative">
                  <div 
                    className="text-center p-3 bg-black/20 rounded-lg border border-white/5 cursor-help"
                    onMouseEnter={() => setShowTooltip(true)}
                    onMouseLeave={() => setShowTooltip(false)}
                  >
                    <div className="text-lg font-semibold text-blue-400">{user?.stats?.connections || 0}</div>
                    <div className="text-xs text-gray-400">Connections</div>
                  </div>
                  {showTooltip && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg border border-gray-700 whitespace-nowrap z-10">
                      Number of AI agents you have connected to
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <button 
                  onClick={() => {
                    onViewProfile();
                    onClose();
                  }}
                  className="w-full py-2 px-4 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg text-sm text-emerald-400 transition-all duration-200 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  View Profile
                </button>
                
                <button className="w-full py-2 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-gray-300 transition-all duration-200 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export Data
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Account Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-100">Account Settings</h3>
                
                {/* Change Password Section */}
                <div className="bg-black/20 rounded-lg border border-white/5 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-sm font-medium text-gray-100">Password</h4>
                      <p className="text-xs text-gray-400">Change your account password</p>
                    </div>
                    <button
                      onClick={() => setShowChangePassword(!showChangePassword)}
                      className="px-3 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded text-xs text-emerald-400 transition-colors"
                    >
                      {showChangePassword ? 'Cancel' : 'Change'}
                    </button>
                  </div>
                  
                  {showChangePassword && (
                    <form onSubmit={handleChangePassword} className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-300 mb-2">
                          Current Password
                        </label>
                        <input
                          type="password"
                          name="currentPassword"
                          value={passwordData.currentPassword}
                          onChange={handlePasswordChange}
                          className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                          placeholder="Enter your current password"
                          required
                          disabled={isUpdatingPassword}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-300 mb-2">
                          New Password
                        </label>
                        <input
                          type="password"
                          name="newPassword"
                          value={passwordData.newPassword}
                          onChange={handlePasswordChange}
                          className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                          placeholder="Enter new password (12-25 characters)"
                          required
                          disabled={isUpdatingPassword}
                          minLength={12}
                          maxLength={25}
                        />
                        
                        {/* Password Requirements */}
                        <div className="mt-2 text-xs space-y-1">
                          <ul className="space-y-1">
                            <li className={`flex items-center space-x-2 ${
                              passwordData.newPassword.length >= 12 && passwordData.newPassword.length <= 25 ? 'text-emerald-400' : 'text-gray-500'
                            }`}>
                              <span>{passwordData.newPassword.length >= 12 && passwordData.newPassword.length <= 25 ? '✓' : '•'}</span>
                              <span>12-25 characters</span>
                            </li>
                            <li className={`flex items-center space-x-2 ${
                              /(?=.*[0-9])/.test(passwordData.newPassword) ? 'text-emerald-400' : 'text-gray-500'
                            }`}>
                              <span>{/(?=.*[0-9])/.test(passwordData.newPassword) ? '✓' : '•'}</span>
                              <span>At least one number</span>
                            </li>
                            <li className={`flex items-center space-x-2 ${
                              /(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(passwordData.newPassword) ? 'text-emerald-400' : 'text-gray-500'
                            }`}>
                              <span>{/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(passwordData.newPassword) ? '✓' : '•'}</span>
                              <span>At least one special character</span>
                            </li>
                          </ul>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-300 mb-2">
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          name="confirmPassword"
                          value={passwordData.confirmPassword}
                          onChange={handlePasswordChange}
                          className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                          placeholder="Confirm your new password"
                          required
                          disabled={isUpdatingPassword}
                        />
                      </div>
                      
                      {/* Message */}
                      {passwordMessage && (
                        <div className={`p-3 rounded-lg text-sm ${
                          passwordMessage.type === 'success' 
                            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                            : 'bg-red-500/10 border border-red-500/20 text-red-400'
                        }`}>
                          {passwordMessage.text}
                        </div>
                      )}
                      
                      <button
                        type="submit"
                        disabled={isUpdatingPassword || passwordErrors.length > 0}
                        className="w-full py-2 px-4 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded text-sm text-emerald-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isUpdatingPassword ? (
                          <div className="flex items-center justify-center space-x-2">
                            <div className="w-4 h-4 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin"></div>
                            <span>Updating...</span>
                          </div>
                        ) : (
                          'Update Password'
                        )}
                      </button>
                    </form>
                  )}
                </div>
              </div>
              
              {/* Logout Button */}
              <div className="pt-4 border-t border-white/10">
                <button 
                  onClick={handleLogout}
                  className="w-full py-2 px-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-sm text-red-400 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 