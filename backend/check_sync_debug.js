const db = require('./database/db_manager');

async function checkSyncStatus() {
    console.log("--- Checking Sync Status for Companies and Users ---");

    const tables = ['companies', 'users'];

    for (const table of tables) {
        console.log(`\nTable: ${table}`);
        const rows = await new Promise((resolve) => {
            db.all(`SELECT id, global_id, username, name, sync_status, created_at, updated_at, datetime('now') as current_db_time FROM ${table}`, (err, rows) => {
                if (err) {
                    console.error(`Error reading ${table}:`, err.message);
                    resolve([]);
                } else {
                    resolve(rows);
                }
            });
        });

        if (rows.length === 0) {
            console.log("No records found.");
        } else {
            console.table(rows);
        }
    }

    // Check for errors in the logs if possible, but for now let's just see pending records for all tables
    console.log("\n--- Pending Records Across All Tables ---");
    const allTables = ['products', 'categories', 'brands', 'vendors', 'customers', 'sales', 'purchases', 'expenses', 'employees', 'roles', 'users', 'companies'];
    for (const table of allTables) {
        const count = await new Promise(resolve => {
            db.get(`SELECT COUNT(*) as count FROM ${table} WHERE sync_status = 'pending'`, (err, row) => resolve(row?.count || 0));
        });
        if (count > 0) {
            console.log(`${table}: ${count} pending`);
        }
    }

    process.exit(0);
}

checkSyncStatus();
