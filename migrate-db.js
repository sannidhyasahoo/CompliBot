/**
 * Database Migration Script
 * Handles database schema updates and migrations
 */

const { createClient } = require('@libsql/client');
const config = require('./src/config/env');

const db = createClient({
    url: config.database.url,
    authToken: config.database.authToken,
});

async function migrateDatabase() {
    console.log('🔄 Starting database migration...');

    try {
        // Check if users table exists and get its structure
        const tableInfo = await db.execute("PRAGMA table_info(users)");
        const columns = tableInfo.rows.map(row => row.name);

        console.log('📊 Current users table columns:', columns);

        // Add language column if it doesn't exist
        if (!columns.includes('language')) {
            console.log('➕ Adding language column...');
            await db.execute({
                sql: 'ALTER TABLE users ADD COLUMN language TEXT DEFAULT "en" CHECK(language IN ("en", "hi", "te"))'
            });
            console.log('✅ Language column added successfully');
        } else {
            console.log('ℹ️  Language column already exists');
        }

        // Update existing users to have default language
        const updateResult = await db.execute({
            sql: 'UPDATE users SET language = "en" WHERE language IS NULL'
        });
        console.log(`✅ Updated ${updateResult.rowsAffected || 0} users with default language`);

        // Verify the migration
        const testUser = await db.execute('SELECT * FROM users LIMIT 1');
        if (testUser.rows.length > 0) {
            console.log('✅ Migration verified - sample user:', testUser.rows[0]);
        }

        console.log('🎉 Database migration completed successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error);

        if (error.message.includes('no such table: users')) {
            console.log('ℹ️  Users table does not exist yet. Run the main application to create it.');
        } else if (error.message.includes('duplicate column name')) {
            console.log('ℹ️  Language column already exists. Migration not needed.');
        }
    }
}

// Run migration if this file is executed directly
if (require.main === module) {
    migrateDatabase().then(() => {
        console.log('Migration script completed');
        process.exit(0);
    }).catch(error => {
        console.error('Migration script failed:', error);
        process.exit(1);
    });
}

module.exports = { migrateDatabase };