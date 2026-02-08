const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'backend/database/business.db');
const db = new sqlite3.Database(dbPath);

console.log('--- LOCAL DATABASE USER CHECK ---');
db.all("SELECT id, username, sync_status, global_id FROM users", [], (err, rows) => {
    if (err) {
        console.error(err);
    } else {
        console.log(`Total users in local DB: ${rows.length}`);
        rows.forEach(row => {
            console.log(`ID: ${row.id} | Username: ${row.username} | Status: ${row.sync_status} | GlobalID: ${row.global_id}`);
        });
    }
    db.close();
});
