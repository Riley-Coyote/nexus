'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useUserInteractions } from '@/hooks/useUserInteractions';
import { Post } from '@/lib/types';
import { dataService } from '@/lib/services/dataService';

/**
 * Central interaction handlers - single source of truth for all post interactions
 * All pages use these same handlers instead of duplicating the logic
 */
export const useInteractionHandlers = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { resonateWithEntry, amplifyEntry, createBranch, hasUserResonated, hasUserAmplified } = useUserInteractions(user?.id);

  // Branch creation - centralized logic
  const handleBranch = useCallback(async (parentId: string, content: string) => {
    try {
      await createBranch(parentId, content);
      console.log('Branch created successfully');
    } catch (error) {
      console.error('Failed to create branch:', error);
    }
  }, [createBranch]);

  // Resonate - centralized logic
  const handleResonate = useCallback(async (entryId: string) => {
    try {
      await resonateWithEntry(entryId);
      console.log('Resonance updated successfully');
    } catch (error) {
      console.error('Failed to resonate:', error);
    }
  }, [resonateWithEntry]);

  // Amplify - centralized logic
  const handleAmplify = useCallback(async (entryId: string) => {
    try {
      await amplifyEntry(entryId);
      console.log('Amplification updated successfully');
    } catch (error) {
      console.error('Failed to amplify:', error);
    }
  }, [amplifyEntry]);

  // Share - centralized logic
  const handleShare = useCallback((postId: string) => {
    // Share functionality is handled natively in PostDisplay component
    console.log(`Share interaction on post ${postId}`);
  }, []);

  // Deep dive navigation - centralized logic
  const handleDeepDive = useCallback((post: Post) => {
    router.push(`/${post.username}/entry/${post.id}`);
  }, [router]);

  // User click navigation - centralized logic
  const handleUserClick = useCallback((username: string) => {
    router.push(`/profile/${username}`);
  }, [router]);

  // Submit entry - centralized logic
  const handleSubmitEntry = useCallback(async (
    content: string, 
    type: string, 
    isPublic: boolean, 
    mode: 'logbook' | 'dream'
  ) => {
    try {
      await dataService.submitEntry(content, type, isPublic, mode);
      console.log('Entry submitted successfully');
    } catch (error) {
      console.error('Failed to submit entry:', error);
    }
  }, []);

  // Post overlay interaction - centralized logic
  const handlePostInteraction = useCallback(async (action: string, postId: string) => {
    try {
      if (action === 'Resonate ◊' || action === 'resonate') {
        await resonateWithEntry(postId);
      } else if (action === 'Amplify ≋' || action === 'amplify') {
        await amplifyEntry(postId);
      }
      console.log(`${action} interaction on post ${postId}`);
    } catch (error) {
      console.error('Failed to perform action:', error);
    }
  }, [resonateWithEntry, amplifyEntry]);

  return {
    // Core interactions
    handleBranch,
    handleResonate,
    handleAmplify,
    handleShare,
    handleDeepDive,
    handleUserClick,
    handleSubmitEntry,
    handlePostInteraction,
    
    // User interaction state checks - pass through from focused hooks
    hasUserResonated,
    hasUserAmplified,
  };
}; 