/**
 * Quick Database Fix Script
 * Fixes common database issues and runs migrations
 */

const { initDB } = require('./src/db');
const { migrateDatabase } = require('./migrate-db');

async function fixDatabase() {
    console.log('🔧 Starting database fix...');

    try {
        // Step 1: Initialize database with latest schema
        console.log('1️⃣ Initializing database...');
        await initDB();

        // Step 2: Run migrations
        console.log('2️⃣ Running migrations...');
        await migrateDatabase();

        // Step 3: Test database operations
        console.log('3️⃣ Testing database operations...');
        const { getUser, getAllStates } = require('./src/db');

        // Test getAllStates
        const states = await getAllStates();
        console.log(`✅ Found ${states.length} states in database`);

        // Test getUser (should return null for non-existent user)
        const testUser = await getUser(999999999);
        console.log(`✅ User query test: ${testUser ? 'Found user' : 'No user found (expected)'}`);

        console.log('🎉 Database fix completed successfully!');
        console.log('💡 You can now run: npm run test:bot');

    } catch (error) {
        console.error('❌ Database fix failed:', error);
        console.log('\n💡 Troubleshooting steps:');
        console.log('1. Check your .env file has correct database credentials');
        console.log('2. Verify your Turso database is accessible');
        console.log('3. Try creating a new database if the current one is corrupted');
    }
}

// Run fix if this file is executed directly
if (require.main === module) {
    fixDatabase().then(() => {
        console.log('Fix script completed');
        process.exit(0);
    }).catch(error => {
        console.error('Fix script failed:', error);
        process.exit(1);
    });
}

module.exports = { fixDatabase };