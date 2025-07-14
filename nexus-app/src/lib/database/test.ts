import { DatabaseFactory } from './factory';
import { StreamEntry } from '../types';

export class DatabaseTester {
  static async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const db = DatabaseFactory.getInstance();
      await db.connect();
      return { success: true, message: '✅ Database connection successful' };
    } catch (error) {
      return { 
        success: false, 
        message: `❌ Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  static async testBasicOperations(): Promise<{ success: boolean; results: string[] }> {
    const results: string[] = [];
    
    try {
      const db = DatabaseFactory.getInstance();
      await db.connect();
      results.push('✅ Connected to database');

      // Test creating an entry
      const testEntry: Omit<StreamEntry, 'id'> = {
        parentId: null,
        children: [],
        depth: 0,
        type: 'TEST_ENTRY',
        agent: 'TestUser',
        connections: 0,
        metrics: { c: 0.5, r: 0.5, x: 0.5 },
        timestamp: new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ''),
        content: 'This is a test entry for database verification',
        actions: ['Test Action'],
        privacy: 'public',
        interactions: { resonances: 0, branches: 0, amplifications: 0, shares: 0 },
        threads: [],
        isAmplified: false,
        userId: 'test_user_123',
        username: 'TestUser'
      };

      const createdEntry = await db.createEntry(testEntry);
      results.push(`✅ Created test entry with ID: ${createdEntry.id}`);

      // Test reading entries
      const entries = await db.getEntries('logbook', { limit: 5 });
      results.push(`✅ Retrieved ${entries.length} entries from database`);

      // Test updating entry
      const updatedEntry = await db.updateEntry(createdEntry.id, {
        content: 'Updated test content',
        interactions: { resonances: 1, branches: 0, amplifications: 0, shares: 0 }
      });
      results.push(`✅ Updated entry: ${updatedEntry.content}`);

      // Test user interactions
      await db.addUserResonance('test_user_123', createdEntry.id);
      results.push('✅ Added user resonance');

      const userResonances = await db.getUserResonances('test_user_123');
      results.push(`✅ Retrieved ${userResonances.length} user resonances`);

      // Cleanup - delete test entry
      await db.deleteEntry(createdEntry.id);
      results.push('✅ Cleaned up test entry');

      return { success: true, results };
    } catch (error) {
      results.push(`❌ Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { success: false, results };
    }
  }

  static async runAllTests(): Promise<void> {
    console.log('🧪 Running database tests...\n');

    // Test 1: Connection
    const connectionTest = await this.testConnection();
    console.log(connectionTest.message);

    if (!connectionTest.success) {
      console.log('\n❌ Connection failed, skipping other tests');
      return;
    }

    // Test 2: Basic operations
    console.log('\n🔧 Testing basic operations...');
    const operationsTest = await this.testBasicOperations();
    
    operationsTest.results.forEach(result => console.log(result));

    if (operationsTest.success) {
      console.log('\n🎉 All database tests passed!');
    } else {
      console.log('\n❌ Some tests failed. Check the logs above.');
    }
  }
}

// Export a function to run tests from console
export const runDatabaseTests = () => DatabaseTester.runAllTests(); 