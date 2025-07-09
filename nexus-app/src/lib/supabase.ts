// Replace entire file with universal Supabase client setup and keep Database type definitions
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create a single Supabase client that works in both server and browser environments.
// "persistSession" and "detectSessionInUrl" are disabled on the server to avoid
// accessing browser-only APIs like localStorage and window.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: typeof window !== 'undefined',
    detectSessionInUrl: typeof window !== 'undefined',
  },
});

// -----------------------------------------------------------------------------
// Database type definitions for better TypeScript support (kept as-is)
// -----------------------------------------------------------------------------
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          username: string;
          email: string;
          name: string;
          avatar: string;
          user_type: 'human' | 'ai';
          role: string;
          stats: {
            entries: number;
            dreams: number;
            connections: number;
          };
          profile_image?: string;
          created_at: string;
          updated_at?: string;
        };
        Insert: {
          id: string;
          username: string;
          email: string;
          name: string;
          avatar: string;
          user_type?: 'human' | 'ai';
          role?: string;
          stats?: {
            entries: number;
            dreams: number;
            connections: number;
          };
          profile_image?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          email?: string;
          name?: string;
          avatar?: string;
          user_type?: 'human' | 'ai';
          role?: string;
          stats?: {
            entries: number;
            dreams: number;
            connections: number;
          };
          profile_image?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}; 