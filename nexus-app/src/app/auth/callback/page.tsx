'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

export default function AuthCallback() {
  const router = useRouter();
  const hasHandledCallback = useRef(false);

  useEffect(() => {
    const handleAuthCallback = async () => {
      if (hasHandledCallback.current) return;
      hasHandledCallback.current = true;

      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // Handle the auth callback
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          router.push('/?error=auth_error');
          return;
        }

        if (data.session) {
          // Check if this is a new user and create profile if needed
          const { data: { user } } = await supabase.auth.getUser();
          
          if (user) {
            // Check if user exists in our users table
            const { data: existingUser } = await supabase
              .from('users')
              .select('id')
              .eq('id', user.id)
              .single();

            if (!existingUser) {
              // Create user profile
              const { error: profileError } = await supabase
                .from('users')
                .insert([
                  {
                    id: user.id,
                    username: user.email?.split('@')[0] || `user_${user.id.slice(0, 8)}`,
                    email: user.email || '',
                    name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
                    avatar: user.email?.slice(0, 2).toUpperCase() || 'US',
                    user_type: 'human',
                    role: 'Explorer',
                    stats: { entries: 0, dreams: 0, connections: 0 },
                    created_at: new Date().toISOString()
                  }
                ]);

              if (profileError) {
                console.error('Error creating user profile:', profileError);
              }
            }
          }

          // Successful authentication
          router.push('/?auth=success');
        } else {
          // No session found
          router.push('/?error=no_session');
        }
      } catch (error) {
        console.error('Unexpected error in auth callback:', error);
        router.push('/?error=unexpected');
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
        </div>
        <h2 className="text-xl font-light mb-2 text-gray-100">Completing authentication...</h2>
        <p className="text-sm text-gray-400">Please wait while we set up your account.</p>
      </div>
    </div>
  );
} 