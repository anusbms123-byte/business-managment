const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '../database/business.db');
const db = new sqlite3.Database(dbPath);

const tables = ['categories', 'brands', 'vendors', 'customers', 'products', 'users', 'roles', 'permissions', 'sales', 'purchases'];

async function deduplicate() {
    console.log("🚀 Starting database deduplication...");

    for (const table of tables) {
        console.log(`Checking table: ${table}...`);

        await new Promise((resolve, reject) => {
            // Find duplicate global_ids
            db.all(`SELECT global_id, COUNT(*) as count FROM ${table} WHERE global_id IS NOT NULL GROUP BY global_id HAVING count > 1`, [], async (err, rows) => {
                if (err) return resolve(); // Table might not have global_id

                if (rows.length === 0) {
                    // console.log(`No duplicates in ${table}.`);
                    return resolve();
                }

                console.log(`Found ${rows.length} duplicate global_ids in ${table}. Merging...`);

                for (const row of rows) {
                    const gid = row.global_id;
                    // Keep the one with the lowest ID (usually the oldest/original)
                    // and delete others.
                    await new Promise((res) => {
                        db.run(`DELETE FROM ${table} WHERE global_id = ? AND id NOT IN (SELECT id FROM ${table} WHERE global_id = ? LIMIT 1)`, [gid, gid], (e) => {
                            if (e) console.error(`Error deduplicating ${table} (${gid}):`, e.message);
                            res();
                        });
                    });
                }
                resolve();
            });
        });
    }

    console.log("✅ Deduplication complete.");
    db.close();
}

deduplicate();
