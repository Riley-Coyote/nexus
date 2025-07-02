'use client';

import React from 'react';
import { X, LucideIcon } from 'lucide-react';

interface NotificationBannerProps {
  show: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  variant?: 'info' | 'success' | 'warning' | 'error' | 'dream' | 'logbook';
  autoHide?: boolean;
  autoHideDelay?: number;
}

export default function NotificationBanner({
  show,
  onClose,
  title,
  subtitle,
  icon: Icon,
  variant = 'info',
  autoHide = true,
  autoHideDelay = 3000
}: NotificationBannerProps) {
  React.useEffect(() => {
    if (show && autoHide) {
      const timer = setTimeout(() => {
        onClose();
      }, autoHideDelay);
      return () => clearTimeout(timer);
    }
  }, [show, autoHide, autoHideDelay, onClose]);

  if (!show) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return 'bg-[#69c4d8] border-emerald-400';
      case 'warning':
        return 'bg-[#69c4d8] border-yellow-400';
      case 'error':
        return 'bg-red-200 border-red-500';
      case 'dream':
        return 'bg-[#69c4d8] border-purple-400';
      case 'logbook':
        return 'bg-[#69c4d8] border-emerald-400';
      case 'info':
      default:
        return 'bg-[#69c4d8] border-emerald-400';
    }
  };

  const getIconColor = () => {
    switch (variant) {
      case 'success':
        return 'text-emerald-600';
      case 'warning':
        return 'text-yellow-600';
      case 'error':
        return 'text-red-600';
      case 'dream':
        return 'text-purple-600';
      case 'logbook':
        return 'text-emerald-600';
      case 'info':
      default:
        return 'text-emerald-600';
    }
  };

  return (
    <div className={`fixed top-4 right-4 z-[9999] ${getVariantStyles()} border rounded-xl px-6 py-4 flex items-center justify-between animate-in slide-in-from-top-2 duration-300 shadow-lg min-w-96 max-w-md`}>
      <div className="flex items-center gap-3">
        {Icon && <Icon className={`w-6 h-6 ${getIconColor()}`} />}
        <div>
          <div className="text-gray-800 font-medium text-lg">{title}</div>
          {subtitle && <div className="text-gray-600 text-sm">{subtitle}</div>}
        </div>
      </div>
      <button 
        onClick={onClose} 
        className="text-gray-600 hover:text-gray-800 transition-colors duration-200 p-1 rounded-full hover:bg-gray-200/30"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
} 