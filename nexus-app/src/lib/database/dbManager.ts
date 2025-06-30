const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env.local') });

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

/**
 * Database Manager - Execute SQL, run migrations, seed data
 * Usage: node -r ts-node/register src/lib/database/dbManager.ts [command]
 */

interface DBManagerConfig {
  supabaseUrl: string;
  supabaseKey: string;
}

class DatabaseManager {
  private supabase;

  constructor(config: DBManagerConfig) {
    this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
  }

  /**
   * Execute raw SQL
   */
  async executeSql(sql: string): Promise<any> {
    try {
      const { data, error } = await this.supabase.rpc('exec_sql', { sql_query: sql });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ SQL execution failed:', error);
      throw error;
    }
  }

  /**
   * Execute SQL file
   */
  async executeSqlFile(filePath: string): Promise<void> {
    try {
      const fullPath = path.resolve(filePath);
      const sql = fs.readFileSync(fullPath, 'utf-8');
      
      console.log(`📄 Executing SQL file: ${filePath}`);
      await this.executeSql(sql);
      console.log('✅ SQL file executed successfully');
    } catch (error) {
      console.error(`❌ Failed to execute SQL file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Run initial schema setup
   */
  async setupSchema(): Promise<void> {
    try {
      await this.executeSqlFile('database/schema.sql');
      console.log('✅ Database schema setup complete');
    } catch (error) {
      console.error('❌ Schema setup failed:', error);
      throw error;
    }
  }

  /**
   * Seed sample data
   */
  async seedData(): Promise<void> {
    const sampleEntries = [
      {
        user_id: 'system',
        type: 'logbook',
        subtype: 'deep-reflection',
        title: 'Sample Deep Reflection',
        content: 'This is a sample deep reflection entry for testing purposes.',
        tags: ['sample', 'testing', 'deep-reflection'],
        timestamp: new Date().toISOString(),
        resonance_field: 0.75,
        quantum_layer: 1
      },
      {
        user_id: 'system',
        type: 'dreams',
        subtype: 'lucid-processing',
        title: 'Sample Dream Entry',
        content: 'A vivid dream about flying through digital landscapes.',
        tags: ['sample', 'testing', 'lucid'],
        timestamp: new Date().toISOString(),
        resonance_field: 0.85,
        quantum_layer: 2
      }
    ];

    try {
      for (const entry of sampleEntries) {
        const { error } = await this.supabase
          .from('stream_entries')
          .insert(entry);
        
        if (error) throw error;
      }
      
      console.log('✅ Sample data seeded successfully');
    } catch (error) {
      console.error('❌ Data seeding failed:', error);
      throw error;
    }
  }

  /**
   * Reset database (dangerous!)
   */
  async resetDatabase(): Promise<void> {
    try {
      console.log('⚠️  Resetting database...');
      
      // Drop all data
      await this.executeSql('TRUNCATE TABLE stream_entries, user_interactions RESTART IDENTITY CASCADE;');
      
      // Re-seed
      await this.seedData();
      
      console.log('✅ Database reset complete');
    } catch (error) {
      console.error('❌ Database reset failed:', error);
      throw error;
    }
  }

  /**
   * Check database health
   */
  async healthCheck(): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('stream_entries')
        .select('count')
        .limit(1);
      
      if (error) throw error;
      
      console.log('✅ Database connection healthy');
      console.log(`📊 Entries in database: ${data?.length || 0}`);
    } catch (error) {
      console.error('❌ Database health check failed:', error);
      throw error;
    }
  }

  /**
   * Create backup
   */
  async createBackup(): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('stream_entries')
        .select('*');
      
      if (error) throw error;
      
      const backup = {
        timestamp: new Date().toISOString(),
        entries: data
      };
      
      const filename = `backup_${new Date().toISOString().split('T')[0]}.json`;
      fs.writeFileSync(filename, JSON.stringify(backup, null, 2));
      
      console.log(`✅ Backup created: ${filename}`);
    } catch (error) {
      console.error('❌ Backup creation failed:', error);
      throw error;
    }
  }
}

// CLI Interface
async function main() {
  const config: DBManagerConfig = {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  };

  const command = process.argv[2] || 'help';

  // Show help without requiring configuration
  if (command === 'help') {
    console.log(`
🗄️ Database Manager Commands:

  npm run db:setup    - Setup database schema
  npm run db:seed     - Seed sample data  
  npm run db:reset    - Reset database (DANGEROUS!)
  npm run db:health   - Check database health
  npm run db:backup   - Create data backup
  npm run db:sql "query" - Execute raw SQL

Examples:
  npm run db:sql "SELECT COUNT(*) FROM stream_entries"
  npm run db:sql "UPDATE stream_entries SET resonance_field = 0.9 WHERE id = 1"

Setup:
  1. Create .env.local with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
  2. Run: npm run db:setup
  3. Run: npm run db:seed
        `);
    return;
  }

  if (!config.supabaseUrl || !config.supabaseKey) {
    console.error('❌ Missing Supabase configuration. Check your .env.local file.');
    console.log('\n📋 Required environment variables:');
    console.log('   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url');
    console.log('   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key');
    console.log('   SUPABASE_SERVICE_ROLE_KEY=your_service_key (optional, for admin operations)');
    process.exit(1);
  }

  const dbManager = new DatabaseManager(config);

  try {
    switch (command) {
      case 'setup':
        await dbManager.setupSchema();
        break;
      
      case 'seed':
        await dbManager.seedData();
        break;
      
      case 'reset':
        console.log('⚠️  This will delete ALL data. Type "yes" to continue:');
        const confirm = await new Promise<string>((resolve) => {
          process.stdin.once('data', (data) => resolve(data.toString().trim()));
        });
        
        if (confirm === 'yes') {
          await dbManager.resetDatabase();
        } else {
          console.log('❌ Reset cancelled');
        }
        break;
      
      case 'health':
        await dbManager.healthCheck();
        break;
      
      case 'backup':
        await dbManager.createBackup();
        break;
      
      case 'sql':
        const sqlQuery = process.argv[3];
        if (!sqlQuery) {
          console.error('❌ Please provide SQL query: npm run db:sql "SELECT * FROM stream_entries"');
          process.exit(1);
        }
        const result = await dbManager.executeSql(sqlQuery);
        console.log('📊 Query Result:', JSON.stringify(result, null, 2));
        break;
      
      default:
        console.log(`❌ Unknown command: ${command}`);
        console.log('Run "npm run db:help" to see available commands.');
        break;
    }
  } catch (error) {
    console.error('❌ Command failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { DatabaseManager }; 