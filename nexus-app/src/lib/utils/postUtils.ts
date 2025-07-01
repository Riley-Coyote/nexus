import { Post, StreamEntry } from '@/lib/types';

/**
 * Converts a StreamEntry to the new Post format
 */
export function streamEntryToPost(entry: StreamEntry): Post {
  return {
    id: entry.id,
    parentId: entry.parentId,
    depth: entry.depth,
    type: entry.type,
    username: entry.username,
    agent: entry.agent,
    connections: entry.connections,
    metrics: entry.metrics,
    timestamp: entry.timestamp,
    content: entry.content,
    interactions: entry.interactions,
    isAmplified: entry.isAmplified,
    privacy: entry.privacy,
    title: entry.title,
    resonance: entry.resonance,
    coherence: entry.coherence,
    tags: entry.tags,
    response: entry.response,
    children: entry.children,
    actions: entry.actions,
    threads: entry.threads,
    userId: entry.userId,
  };
}

/**
 * Converts a Post to StreamEntry format (adds required fields)
 */
export function postToStreamEntry(post: Post): StreamEntry {
  return {
    ...post,
    agent: post.agent || post.username, // Fallback to username if agent not set
    parentId: post.parentId || null, // Ensure null instead of undefined
    children: post.children || [],
    actions: post.actions || ["Resonate ◊", "Branch ∞", "Amplify ≋", "Share ∆"],
    threads: post.threads || [],
  };
}

/**
 * Converts legacy StreamEntryData to Post format
 */
export function streamEntryDataToPost(data: any): Post {
  return {
    id: data.id,
    parentId: data.parentId,
    depth: data.depth,
    type: data.type,
    username: data.username,
    agent: data.agent || data.username, // Use agent if available, fallback to username
    connections: data.connections,
    metrics: data.metrics,
    timestamp: data.timestamp,
    content: data.content,
    interactions: data.interactions,
    isAmplified: data.isAmplified,
    privacy: data.privacy,
    title: data.title,
    resonance: data.resonance,
    coherence: data.coherence,
    tags: data.tags,
    response: data.response,
  };
}

/**
 * Determines the context for a post based on its properties
 */
export function getPostContext(post: Post): 'feed' | 'logbook' | 'dream' | 'profile' | 'resonance' {
  if (post.resonance !== undefined || post.tags) {
    return 'dream';
  }
  if (post.type?.toLowerCase().includes('resonance')) {
    return 'resonance';
  }
  return 'logbook';
}

/**
 * Determines appropriate display mode based on context and content
 */
export function getDisplayMode(
  context: string, 
  contentLength: number, 
  isReply: boolean = false
): 'preview' | 'full' | 'compact' {
  if (context === 'profile' && contentLength < 100) {
    return 'compact';
  }
  if (isReply || contentLength < 200) {
    return 'full';
  }
  return 'preview';
} 