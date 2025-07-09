// Re-export the single Supabase client from AuthContext to ensure singleton pattern
export { supabase } from '@/lib/auth/AuthContext';

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