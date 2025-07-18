import React, { useEffect, useRef } from 'react';
import { FollowRelationship } from '@/lib/database/types';

interface FollowsModalProps {
  title: string;
  follows: FollowRelationship[];
  isOpen: boolean;
  onClose: () => void;
  onUserClick?: (username: string) => void;
}

export default function FollowsModal({
  title,
  follows,
  isOpen,
  onClose,
  onUserClick,
}: FollowsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

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

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={modalRef}
        className="max-h-[80vh] w-full max-w-md mx-4 p-6 overflow-y-auto bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl relative"
      >
        {/* Close Btn */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-200 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 id="modal-title" className="text-xl font-semibold text-white mb-4 text-center">{title}</h2>

        {follows.length === 0 ? (
          <p className="text-gray-400 text-sm text-center">No users found.</p>
        ) : (
          <ul className="space-y-4">
            {follows.map(({ user }, idx) => (
              <li
                key={user.id + idx}
                className="flex items-center gap-4 cursor-pointer hover:bg-white/5 p-2 rounded-lg"
                onClick={() => onUserClick?.(user.username)}
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-sm font-medium text-gray-100 flex-shrink-0">
                  {user.profileImage ? (
                    <img
                      src={user.profileImage}
                      alt={user.name}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    user.avatar
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-gray-100 text-sm font-medium leading-none">{user.name}</p>
                  <p className="text-gray-400 text-xs">@{user.username}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
} 