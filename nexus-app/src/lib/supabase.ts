import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Verify required environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env.local file.');
}

// Use service role key on server to bypass RLS, anon key on client
const isServer = typeof window === 'undefined';
const supabaseKey = isServer && supabaseServiceRoleKey
  ? supabaseServiceRoleKey
  : supabaseAnonKey;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Database type definitions for better TypeScript support
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