
const syncService = require('./backend/services/sync_service');
const db = require('./backend/database/db_manager');

async function pushNow() {
    console.log("Starting immediate cloud push...");

    // Get the first company ID to use as context
    const company = await new Promise((resolve) => {
        db.get("SELECT global_id FROM companies LIMIT 1", (err, row) => resolve(row));
    });

    if (company && company.global_id) {
        console.log(`Setting sync context for Company: ${company.global_id}`);
        syncService.setCompanyId(company.global_id);
    } else {
        console.warn("No company found, sync might be limited.");
    }

    console.log("Triggering syncPendingRecords...");
    await syncService.syncPendingRecords();

    console.log("\n[PUSH COMPLETED] Check the logs above for status of each record.");
    console.log("Records marked with 'synced' in local DB will not be pushed again.");

    process.exit(0);
}

pushNow().catch(err => {
    console.error("Push script failed:", err);
    process.exit(1);
});
