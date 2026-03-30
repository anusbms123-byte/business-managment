
const db = require('../database/db_manager');
const syncService = require('../services/sync_service');

async function forceResetLocal() {
    console.log("\n[RESET] !!! DELETING ALL LOCAL DATA !!!");

    const tables = [
        'products', 'categories', 'brands', 'vendors', 'customers',
        'sales', 'sale_items', 'purchases', 'purchase_items',
        'expenses', 'employees', 'attendances', 'salary_records',
        'accounts', 'audit_logs', 'sale_returns', 'purchase_returns',
        'pending_sync_deletions'
    ];

    return new Promise((resolve, reject) => {
        db.serialize(async () => {
            try {
                await db.run("BEGIN TRANSACTION");

                for (const table of tables) {
                    await new Promise(r => db.run(`DELETE FROM ${table}`, () => r()));
                }

                // Reset all records to 'synced' state if they are kept (we don't keep them here)
                // But specifically for Companies and Roles, we might want to keep the GIDs to avoid re-login issues
                // Instead, let's just clear everything and let the first pull on next start fix them.
                
                await db.run("COMMIT");
                console.log("✓ Local database cleared successfully.");
                
                // Also clear the 'sync_status' of top-level entities just in case
                await db.run("UPDATE companies SET sync_status = NULL");
                await db.run("UPDATE roles SET sync_status = NULL");

                console.log("\n[RESET DONE]");
                console.log("Next time you open the app, it will do a full pull from Cloud.");
                resolve();
            } catch (err) {
                await db.run("ROLLBACK");
                console.error("[RESET ERROR]", err.message);
                reject(err);
            }
        });
    });
}

forceResetLocal()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
