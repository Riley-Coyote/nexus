'use client';

import React, { useState, useRef, useCallback } from 'react';
import { storageService } from '@/lib/services/storageService';

interface ImageUploadProps {
  currentImageUrl?: string;
  onUpload: (imageUrl: string) => void;
  onError: (error: string) => void;
  type: 'profile' | 'banner';
  userId: string;
  disabled?: boolean;
}

export default function ImageUpload({
  currentImageUrl,
  onUpload,
  onError,
  type,
  userId,
  disabled = false
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      handleFileUpload(imageFile);
    } else {
      onError('Please drop an image file');
    }
  }, [disabled, onError]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  }, []);

  const handleFileUpload = async (file: File) => {
    if (disabled) return;

    setIsUploading(true);
    
    try {
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to storage with timeout protection
      const uploadPromise = storageService.uploadProfileImage(userId, file, type);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Upload timeout after 45 seconds')), 45000);
      });
      
      const result = await Promise.race([uploadPromise, timeoutPromise]);
      
      // Validate the result before proceeding
      if (!result || typeof result !== 'object') {
        throw new Error('Invalid upload result received');
      }
      
      if (!result.publicUrl || typeof result.publicUrl !== 'string') {
        throw new Error('Invalid image URL received from upload service');
      }
      
      // Ensure the URL is properly formatted
      const imageUrl = result.publicUrl.trim();
      if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
        throw new Error('Invalid image URL format');
      }
      
      // Call onUpload with the validated URL
      onUpload(imageUrl);
      
    } catch (error) {
      console.error('Upload error:', error);
      let errorMessage = 'Failed to upload image';
      
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          errorMessage = 'Upload timed out. Please try again with a smaller image.';
        } else if (error.message.includes('size')) {
          errorMessage = 'Image is too large. Please choose a smaller image.';
        } else if (error.message.includes('type') || error.message.includes('format')) {
          errorMessage = 'Invalid image format. Please choose a JPEG, PNG, WebP, or GIF image.';
        } else {
          errorMessage = error.message;
        }
      }
      
      onError(errorMessage);
      // Reset preview on error
      setPreviewUrl(currentImageUrl || null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleRemove = () => {
    if (disabled) return;
    setPreviewUrl(null);
    onUpload(''); // Clear the image
  };

  const isProfile = type === 'profile';
  const aspectRatio = isProfile ? 'aspect-square' : 'aspect-[3/1]';
  const dimensions = isProfile ? 'w-40 h-40' : 'w-full h-40';

  return (
    <div className="space-y-4">
      <div
        className={`
          relative ${dimensions} ${aspectRatio} border-2 border-dashed rounded-2xl
          transition-all duration-300 cursor-pointer group overflow-hidden
          mx-auto bg-gradient-to-br from-slate-800/50 to-slate-900/50
          ${isDragging 
            ? 'border-emerald-400 bg-emerald-500/20 scale-[1.02] shadow-lg shadow-emerald-500/25 ring-2 ring-emerald-400/30' 
            : 'border-slate-600 hover:border-emerald-400/60 hover:bg-slate-800/60 hover:scale-[1.01]'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${isProfile ? 'rounded-full' : 'rounded-2xl'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
        />

        {/* Preview or placeholder */}
        {previewUrl ? (
          <div className="relative w-full h-full">
            <img
              src={previewUrl}
              alt={`${type} preview`}
              className={`w-full h-full object-cover ${isProfile ? 'rounded-full' : 'rounded-lg'}`}
            />
            
            {/* Overlay */}
            <div className={`
              absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 
              transition-opacity duration-200 flex items-center justify-center
              ${isProfile ? 'rounded-full' : 'rounded-lg'}
            `}>
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClick();
                  }}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                  disabled={disabled}
                >
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove();
                  }}
                  className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors"
                  disabled={disabled}
                >
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-300">
            {isUploading ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-3 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-medium">Uploading...</span>
              </div>
            ) : (
              <>
                <div className={`
                  ${isProfile ? 'w-16 h-16' : 'w-12 h-12'} 
                  mb-3 rounded-full bg-gradient-to-br from-emerald-500/20 to-purple-500/20
                  flex items-center justify-center
                `}>
                  <svg className={`${isProfile ? 'w-8 h-8' : 'w-6 h-6'} text-emerald-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <div className="text-center">
                  <span className="text-sm font-medium text-gray-200 block">
                    {isDragging ? 'Drop image here' : `Add ${type} image`}
                  </span>
                  <span className="text-xs text-gray-400 mt-1 block">
                    Click to browse or drag & drop
                  </span>
                  {!isProfile && (
                    <span className="text-xs text-gray-500 mt-2 block">
                      Recommended: 1200×400px
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Loading overlay */}
        {isUploading && (
          <div className={`
            absolute inset-0 bg-black/50 flex items-center justify-center
            ${isProfile ? 'rounded-full' : 'rounded-lg'}
          `}>
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {/* Helper text */}
      <div className="text-xs text-center text-gray-400 bg-slate-800/30 rounded-lg p-3 border border-slate-700/50">
        <div className="flex items-center justify-center gap-4 text-xs">
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            JPEG, PNG, WebP, GIF
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Up to 50MB
          </span>
        </div>
        {isProfile && (
          <p className="mt-2 text-emerald-400/70">
            💡 Square images work best for profile photos
          </p>
        )}
      </div>
    </div>
  );
} 