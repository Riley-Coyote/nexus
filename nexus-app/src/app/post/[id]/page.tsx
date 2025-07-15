import React from 'react';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import PostDetailClient from '@/components/PostDetailClient';
import { dataService } from '@/lib/services/dataService';
import { streamEntryToPost } from '@/lib/utils/postUtils';
import { getServerCurrentUser } from '@/lib/auth/serverAuth';

interface PostPageProps {
  params: Promise<{ id: string }>;
}

export default async function PostPage({ params }: PostPageProps) {
  const { id } = await params;

  // Get server current user
  const user = await getServerCurrentUser();

  // Fetch the entry by ID
  const entry = await dataService.getEntryById(id);
  if (!entry) {
    notFound();
  }

  const post = streamEntryToPost(entry);

  // Fetch threading context
  const parentEntry = await dataService.getParentPost(id);
  const parentPost = parentEntry ? streamEntryToPost(parentEntry) : null;
  const childEntries = await dataService.getDirectChildren(id, user?.id);
  const childPosts = childEntries.map(streamEntryToPost);

  return (
    <div className="liminal-logbook min-h-screen flex flex-col bg-app-background">
      <Header currentMode="logbook" currentView="feed" />
      <main className="flex-1 flex flex-col items-center justify-start pt-8 px-4 sm:px-0">
        <div className="max-w-2xl w-full">
          <PostDetailClient post={post} parent={parentPost} childPosts={childPosts} />
        </div>
      </main>
    </div>
  );
} 