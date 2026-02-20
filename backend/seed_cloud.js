
const db = require('./database/db_manager');
const syncService = require('./services/sync_service');
const { randomUUID } = require('crypto');

const tables = [
    'companies', 'categories', 'brands', 'vendors', 'customers',
    'roles', 'users', 'products', 'employees', 'expenses',
    'sales', 'purchases', 'accounts', 'sale_returns',
    'purchase_returns', 'attendances', 'salary_records', 'audit_logs', 'permissions'
];

async function seedAllData() {
    console.log("\n[SEED] Starting complete data seeding process...");

    return new Promise((resolve, reject) => {
        db.serialize(async () => {
            try {
                // 1. Get a valid fallback company ID
                const mainCompany = await new Promise((res) => {
                    db.get("SELECT global_id, name FROM companies WHERE name != 'Main Company' LIMIT 1", (err, row) => {
                        if (row) res(row);
                        else db.get("SELECT global_id, name FROM companies LIMIT 1", (e, r) => res(r));
                    });
                });

                if (!mainCompany || !mainCompany.global_id) {
                    throw new Error("No companies found in database. Please create a company first.");
                }
                const fallbackCid = mainCompany.global_id;
                console.log(`[SEED] Using '${mainCompany.name}' (${fallbackCid}) as primary company.`);

                // 2. Fix orphaned records (IMPORTANT for foreign key constraints on cloud)
                console.log("[SEED] Fixing orphaned company references...");
                for (const table of tables) {
                    if (table === 'companies') continue;

                    // Check if table has company_id column
                    const hasCid = await new Promise(res => {
                        db.all(`PRAGMA table_info(${table})`, (err, rows) => {
                            res(rows && rows.some(r => r.name === 'company_id'));
                        });
                    });

                    if (hasCid) {
                        await new Promise(res => {
                            db.run(`
                                UPDATE ${table} 
                                SET company_id = ? 
                                WHERE company_id NOT IN (SELECT global_id FROM companies) 
                                OR company_id IS NULL 
                                OR company_id = ''
                            `, [fallbackCid], function (err) {
                                if (this.changes > 0) {
                                    console.log(`[SEED] Fixed ${this.changes} orphaned records in ${table}`);
                                }
                                res();
                            });
                        });
                    }
                }

                // 3. Mark everything as pending and ensure global_id exists
                console.log("[SEED] Marking all records as 'pending' for sync...");
                for (const table of tables) {
                    await new Promise((resTable) => {
                        db.all(`SELECT id, global_id FROM ${table}`, [], async (err, rows) => {
                            if (err || !rows) return resTable();

                            if (rows.length > 0) {
                                console.log(`[SEED] Resetting ${rows.length} records in ${table}...`);
                            }

                            for (const row of rows) {
                                let gid = row.global_id;
                                // If GID contains dashes, it's a local UUID, we keep it but mark pending.
                                // If GID is missing, we create one.
                                if (!gid || gid === 'null' || gid === 'undefined' || gid === '') {
                                    gid = randomUUID();
                                }

                                await new Promise(r => db.run(
                                    `UPDATE ${table} SET sync_status = 'pending', global_id = ? WHERE id = ?`,
                                    [gid, row.id],
                                    () => r()
                                ));
                            }
                            resTable();
                        });
                    });
                }

                console.log("[SEED] Database prepared. Starting cloud synchronization...");

                // 4. Set Company ID context for SyncService
                syncService.setCompanyId(fallbackCid);

                // 5. Trigger the actual sync
                console.log("[SEED] Triggering sync service...");
                await syncService.syncPendingRecords();

                console.log("\n[SEED INITIATED]");
                console.log("[SEED] All data is being pushed to the cloud in the background.");
                resolve();
            } catch (error) {
                console.error("[SEED ERROR]", error);
                reject(error);
            }
        });
    });
}

seedAllData()
    .then(() => {
        console.log("Seed process started. You can check the cloud dashboard shortly.");
        // We wait a bit more because background push might be working
        setTimeout(() => process.exit(0), 15000);
    })
    .catch(err => {
        console.error("Seed process failed:", err);
        process.exit(1);
    });
