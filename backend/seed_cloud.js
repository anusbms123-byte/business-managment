
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { randomUUID } = require('crypto');

const dbPath = path.join(__dirname, 'database', 'business.db');
const db = new sqlite3.Database(dbPath);

const tables = [
    'companies', 'categories', 'brands', 'vendors', 'customers',
    'roles', 'users', 'products', 'employees', 'expenses',
    'sales', 'purchases', 'accounts', 'sale_returns',
    'purchase_returns', 'attendances', 'salary_records', 'audit_logs'
];

async function seed() {
    console.log("Starting Seeding Process...");

    for (const table of tables) {
        console.log(`Processing table: ${table}...`);

        await new Promise((resolve) => {
            // Check if table exists
            db.get("SELECT name FROM sqlite_master WHERE type='table' AND name=?", [table], async (err, tRow) => {
                if (!tRow) {
                    console.log(`Table ${table} does not exist, skipping.`);
                    return resolve();
                }

                db.all(`SELECT id, global_id FROM ${table}`, [], async (err, rows) => {
                    if (err) {
                        console.error(`Error reading ${table}:`, err.message);
                        return resolve();
                    }

                    console.log(`Found ${rows.length} records in ${table}`);

                    for (const row of rows) {
                        const gid = row.global_id || randomUUID();
                        await new Promise((res) => {
                            db.run(
                                `UPDATE ${table} SET global_id = ?, sync_status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                                [gid, row.id],
                                (updateErr) => {
                                    if (updateErr) console.error(`Update failed for ${table} ID ${row.id}:`, updateErr.message);
                                    res();
                                }
                            );
                        });
                    }
                    resolve();
                });
            });
        });
    }

    // Special case for permissions 
    console.log("Processing permissions...");
    await new Promise((resolve) => {
        db.all("SELECT id, global_id FROM permissions", [], async (err, rows) => {
            if (err) return resolve();
            console.log(`Found ${rows.length} records in permissions`);
            for (const row of rows) {
                const gid = row.global_id || randomUUID();
                await new Promise(r => db.run("UPDATE permissions SET global_id = ?, sync_status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [gid, row.id], r));
            }
            resolve();
        });
    });

    console.log("\n[DONE] All local records marked as 'pending' for sync.");
    console.log("The background sync process will now start pushing data to the cloud.");

    db.close();
}

seed().catch(err => console.error(err));
