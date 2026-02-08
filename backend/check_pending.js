const db = require('./database/db_manager');

async function checkPending() {
    const tables = ['companies', 'users', 'products', 'customers', 'vendors'];
    for (const table of tables) {
        process.stdout.write(`Checking ${table}... `);
        const rows = await new Promise(resolve => {
            db.all(`SELECT id, global_id, sync_status, updated_at, datetime('now', '-5 minutes') as five_min_ago FROM ${table} WHERE sync_status = 'pending'`, (err, rows) => {
                if (err) {
                    console.error(err.message);
                    resolve([]);
                } else {
                    resolve(rows);
                }
            });
        });
        console.log(`${rows.length} pending records.`);
        if (rows.length > 0) {
            console.table(rows);
        }
    }
    process.exit(0);
}

checkPending();
