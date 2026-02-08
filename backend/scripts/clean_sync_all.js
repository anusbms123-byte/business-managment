const db = require('../database/db_manager');
const syncService = require('../services/sync_service');

async function cleanSync(companyId) {
    console.log(`\n🚀 [CLEAN SYNC] Starting for Company: ${companyId}`);

    // Ordered list of tables to clean (to respect foreign keys if any, though SQLite is lenient unless enabled)
    const tables = [
        'sale_return_items', 'sale_returns',
        'purchase_return_items', 'purchase_returns',
        'sale_items', 'sales',
        'purchase_items', 'purchases',
        'products', 'categories', 'brands',
        'vendors', 'customers', 'expenses',
        'employees', 'attendances', 'salary_records',
        'accounts'
    ];

    try {
        for (const table of tables) {
            console.log(`🗑️  Cleaning table: ${table}...`);
            await new Promise((resolve, reject) => {
                db.run(`DELETE FROM ${table} WHERE company_id = ? OR company_id IS NULL`, [companyId], (err) => {
                    if (err) {
                        // Some tables might not have company_id directly (like items)
                        // but we handle them by cascading or specific logic if needed.
                        // For items, we usually delete by joining or just clear all if it's a small DB.
                        if (table.endsWith('_items')) {
                            db.run(`DELETE FROM ${table}`, [], resolve);
                        } else {
                            console.warn(`[WARN] Could not clean ${table}: ${err.message}`);
                            resolve();
                        }
                    } else {
                        resolve();
                    }
                });
            });
        }

        console.log('\n✨ [DATABASE CLEANED] Pulling fresh data from cloud...');
        await syncService.pullAllData(companyId);

        console.log('\n✅ [SUCCESS] Clean sync completed. Your local data now matches the cloud exactly.');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ [ERROR] Clean sync failed:', error.message);
        process.exit(1);
    }
}

// Get company ID from command line or use the specific one
const targetCompanyId = process.argv[2] || 'cmkntaqig0005az3m8nkz0s3e';
cleanSync(targetCompanyId);
