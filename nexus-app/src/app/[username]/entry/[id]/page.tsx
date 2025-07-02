import React from 'react';
import { notFound, redirect } from 'next/navigation';
import Header from '@/components/Header';
import PostDetailClient from '@/components/PostDetailClient';
import { dataService } from '@/lib/services/dataService';
import { streamEntryToPost } from '@/lib/utils/postUtils';
import PrivatePostPageClient from '@/components/PrivatePostPageClient';

interface PostDetailPageProps {
  params: { username: string; id: string };
}

export default async function PostDetailPage({ params }: PostDetailPageProps) {
  const { username, id } = params;

  // Fetch the entry by ID
  const entry = await dataService.getEntryById(id);
  if (!entry) notFound();

  // Redirect to canonical URL if username mismatch
  if (entry.username.toLowerCase() !== username.toLowerCase()) {
    redirect(`/${entry.username}/entry/${id}`);
  }

  // Convert to Post and fetch thread context
  const post = streamEntryToPost(entry);
  
  // Fetch parent and children with debug logging
  const parentEntry = await dataService.getParentPost(id);
  const parentPost = parentEntry ? streamEntryToPost(parentEntry) : null;
  
  const childEntries = await dataService.getDirectChildren(id);
  const childPosts = childEntries.map(streamEntryToPost);

  // Debug logging - Server side
  console.log(`\n🔍 ENTRY DETAIL DEBUG for ${id}:`);
  console.log(`📝 Main post: ${post.title || post.content.substring(0, 50)}...`);
  console.log(`👆 Parent: ${parentPost ? (parentPost.title || parentPost.content.substring(0, 50)) + '...' : 'None'}`);
  console.log(`👶 Children count: ${childPosts.length}`);
  if (childPosts.length > 0) {
    console.log('📋 Children details:');
    childPosts.forEach((child, idx) => {
      console.log(`  ${idx + 1}. ${child.id} - ${child.content.substring(0, 50)}... (parent: ${child.parentId})`);
    });
  } else {
    console.log('❌ NO CHILDREN FOUND! Checking raw data...');
    // Let's check if the getDirectChildren method is working
    const rawChildren = await dataService.getDirectChildren(id);
    console.log(`🔍 Raw children from dataService: ${rawChildren.length}`);
    if (rawChildren.length > 0) {
      console.log('📋 Raw children:', rawChildren.map(c => ({ id: c.id, parentId: c.parentId })));
    }
  }
  console.log(`\n`);

  // Delegate rendering and privacy gating to client
  return (
    <PrivatePostPageClient 
      post={post} 
      parent={parentPost} 
      childPosts={childPosts}
      isDeepDive={true}
    />
  );
} 