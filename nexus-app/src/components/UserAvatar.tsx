'use client';

import React, { useState } from 'react';

interface UserAvatarProps {
  profileImage?: string;
  avatar: string;
  username: string;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-xl'
};

export default function UserAvatar({ 
  profileImage, 
  avatar, 
  username, 
  name, 
  size = 'md', 
  className = '',
  onClick 
}: UserAvatarProps) {
  const [imageError, setImageError] = useState(false);

  const handleImageError = () => {
    setImageError(true);
  };

  const showFallback = !profileImage || imageError;

  return (
    <div 
      className={`
        ${sizeClasses[size]} 
        rounded-full 
        bg-gradient-to-br 
        from-emerald-500/20 
        to-purple-500/20 
        border 
        border-white/10 
        flex 
        items-center 
        justify-center 
        font-medium 
        text-gray-100 
        flex-shrink-0 
        overflow-hidden
        ${onClick ? 'cursor-pointer hover:border-white/20 transition-colors' : ''}
        ${className}
      `}
      onClick={onClick}
      title={name}
    >
      {showFallback ? (
        <span className="font-semibold">
          {avatar}
        </span>
      ) : (
        <img 
          src={profileImage} 
          alt={`${name}'s profile`}
          className="w-full h-full object-cover"
          onError={handleImageError}
          loading="lazy"
          // Add caching headers for better performance
          referrerPolicy="no-referrer"
        />
      )}
    </div>
  );
} 