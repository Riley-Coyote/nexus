import { DatabaseProvider, DatabaseConfig } from './types';
import { SupabaseProvider } from './supabaseProvider';
// Future providers can be imported here
// import { PostgreSQLProvider } from './postgresProvider';
// import { MySQLProvider } from './mysqlProvider';

class DatabaseFactory {
  private static instance: DatabaseProvider | null = null;

  static createProvider(config: DatabaseConfig): DatabaseProvider {
    switch (config.provider) {
      case 'supabase':
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        
        if (!supabaseUrl || !supabaseKey) {
          throw new Error(
            'Supabase configuration missing. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
          );
        }
        
        return new SupabaseProvider(supabaseUrl, supabaseKey);
      
      case 'postgresql':
        // throw new Error('PostgreSQL provider not implemented yet');
        // return new PostgreSQLProvider(config.connectionString!);
        
      case 'mysql':
        // throw new Error('MySQL provider not implemented yet');
        // return new MySQLProvider(config.connectionString!);
        
      case 'sqlite':
        // throw new Error('SQLite provider not implemented yet');
        // return new SQLiteProvider(config.connectionString!);
        
      case 'mock':
        // Return mock provider for testing
        throw new Error('Mock provider not implemented yet');
        
      default:
        throw new Error(`Unsupported database provider: ${config.provider}`);
    }
  }

  static getInstance(): DatabaseProvider {
    if (!DatabaseFactory.instance) {
      const config: DatabaseConfig = {
        provider: (process.env.NEXT_PUBLIC_DATABASE_PROVIDER as any) || 'supabase',
        connectionString: process.env.DATABASE_URL,
        options: {}
      };
      
      DatabaseFactory.instance = DatabaseFactory.createProvider(config);
    }
    
    return DatabaseFactory.instance;
  }

  static resetInstance(): void {
    DatabaseFactory.instance = null;
  }
}

export { DatabaseFactory };

// Environment variable validation
export function validateDatabaseConfig(): void {
  const provider = process.env.NEXT_PUBLIC_DATABASE_PROVIDER || 'supabase';
  
  switch (provider) {
    case 'supabase':
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        throw new Error('NEXT_PUBLIC_SUPABASE_URL is required for Supabase provider');
      }
      if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required for Supabase provider');
      }
      break;
      
    case 'postgresql':
    case 'mysql':
    case 'sqlite':
      if (!process.env.DATABASE_URL) {
        throw new Error(`DATABASE_URL is required for ${provider} provider`);
      }
      break;
      
    default:
      throw new Error(`Unknown database provider: ${provider}`);
  }
} 