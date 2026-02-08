const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'database/business.db');
const db = new sqlite3.Database(dbPath);

const targetCompany = "cmkntaqig0005az3m8nkz0s3e";

console.log(`--- USERS FOR COMPANY: ${targetCompany} ---`);
db.all("SELECT id, username, sync_status, company_id, global_id FROM users WHERE company_id = ?", [targetCompany], (err, rows) => {
    if (err) {
        console.error(err);
    } else {
        console.log(`Total users for this company: ${rows.length}`);
        rows.forEach(row => {
            console.log(`ID: ${row.id} | Username: ${row.username} | Status: ${row.sync_status} | GlobalID: ${row.global_id}`);
        });
    }
    db.close();
});
