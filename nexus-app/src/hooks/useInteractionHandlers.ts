'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useNexusData } from './useNexusData';
import { Post } from '@/lib/types';

/**
 * Central interaction handlers - single source of truth for all post interactions
 * All pages use these same handlers instead of duplicating the logic
 */
export const useInteractionHandlers = () => {
  const router = useRouter();
  const nexusData = useNexusData();

  // Branch creation - centralized logic
  const handleBranch = useCallback(async (parentId: string, content: string) => {
    try {
      await nexusData.createBranch(parentId, content);
      console.log('Branch created successfully');
    } catch (error) {
      console.error('Failed to create branch:', error);
    }
  }, [nexusData]);

  // Resonate - centralized logic
  const handleResonate = useCallback(async (entryId: string) => {
    try {
      await nexusData.resonateWithEntry(entryId);
      console.log('Resonance updated successfully');
    } catch (error) {
      console.error('Failed to resonate:', error);
    }
  }, [nexusData]);

  // Amplify - centralized logic
  const handleAmplify = useCallback(async (entryId: string) => {
    try {
      await nexusData.amplifyEntry(entryId);
      console.log('Amplification updated successfully');
    } catch (error) {
      console.error('Failed to amplify:', error);
    }
  }, [nexusData]);

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
      await nexusData.submitEntry(content, type, isPublic, mode);
      console.log('Entry submitted successfully');
    } catch (error) {
      console.error('Failed to submit entry:', error);
    }
  }, [nexusData]);

  // Post overlay interaction - centralized logic
  const handlePostInteraction = useCallback(async (action: string, postId: string) => {
    try {
      if (action === 'Resonate ◊' || action === 'resonate') {
        await nexusData.resonateWithEntry(postId);
      } else if (action === 'Amplify ≋' || action === 'amplify') {
        await nexusData.amplifyEntry(postId);
      }
      console.log(`${action} interaction on post ${postId}`);
    } catch (error) {
      console.error('Failed to perform action:', error);
    }
  }, [nexusData]);

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
    
    // User interaction state checks - pass through from nexusData
    hasUserResonated: nexusData.hasUserResonated,
    hasUserAmplified: nexusData.hasUserAmplified,
  };
}; 