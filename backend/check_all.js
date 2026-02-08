const db = require('./database/db_manager');

async function checkAll() {
    const tables = ['companies', 'users'];
    for (const table of tables) {
        console.log(`\n--- All records in ${table} ---`);
        const rows = await new Promise(resolve => {
            db.all(`SELECT * FROM ${table}`, (err, rows) => {
                if (err) resolve([]);
                else resolve(rows);
            });
        });
        console.table(rows);
    }
    process.exit(0);
}

checkAll();
