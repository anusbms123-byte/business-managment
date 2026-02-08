const db = require('./database/db_manager');

async function inspectSchema() {
    const tables = ['users', 'companies', 'products'];
    for (const table of tables) {
        console.log(`\nSchema for ${table}:`);
        await new Promise(resolve => {
            db.all(`PRAGMA table_info(${table})`, (err, rows) => {
                if (err) console.error(err);
                else console.table(rows);
                resolve();
            });
        });
    }
    process.exit(0);
}

inspectSchema();
