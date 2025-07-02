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
  const parentEntry = await dataService.getParentPost(id);
  const parentPost = parentEntry ? streamEntryToPost(parentEntry) : null;
  const childEntries = await dataService.getDirectChildren(id);
  const childPosts = childEntries.map(streamEntryToPost);

  // Delegate rendering and privacy gating to client
  return (
    <PrivatePostPageClient post={post} parent={parentPost} childPosts={childPosts} />
  );
} 