const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../database/business.db');
const db = new sqlite3.Database(dbPath);

console.log('🧹 Deduplicating Roles & Enforcing Constraints...');

function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

function all(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

(async () => {
    try {
        // 1. Find all duplicates based on global_id
        console.log('Finding duplicates...');
        const duplicates = await all(`
            SELECT global_id, COUNT(*) as count 
            FROM roles 
            WHERE global_id IS NOT NULL 
            GROUP BY global_id 
            HAVING count > 1
        `);

        console.log(`Found ${duplicates.length} sets of duplicate roles.`);

        for (const dup of duplicates) {
            console.log(`Processing duplicates for ${dup.global_id}...`);
            // Get all IDs for this global_id
            const rows = await all("SELECT id FROM roles WHERE global_id = ? ORDER BY id ASC", [dup.global_id]);

            // Keep the first one, delete the rest
            const idsToDelete = rows.slice(1).map(r => r.id);
            if (idsToDelete.length > 0) {
                const placeholders = idsToDelete.map(() => '?').join(',');
                await run(`DELETE FROM roles WHERE id IN (${placeholders})`, idsToDelete);
                console.log(`  - Deleted ${idsToDelete.length} duplicates for ${dup.global_id}`);
            }
        }

        // 2. Add UNIQUE Index to prevent future duplicates
        console.log('Adding UNIQUE constraint to global_id...');
        try {
            await run("CREATE UNIQUE INDEX IF NOT EXISTS idx_roles_global_id ON roles(global_id)");
            console.log('  - Unique index created successfully.');
        } catch (e) {
            console.log('  - Index creation warning:', e.message);
        }

        // 3. Clean up Users table
        // We might have users pointing to role_ids (names) instead of global_id
        // But we already fixed role_ids in cleanup_roles.js

        console.log('\n✅ Deduplication Complete!');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        db.close();
    }
})();
