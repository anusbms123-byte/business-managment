const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'backend', 'bms.db');
const db = new sqlite3.Database(dbPath);

console.log("Checking DB at:", dbPath);

db.all("SELECT id, global_id, username, role, company_id, sync_status, is_active FROM users", [], (err, rows) => {
    if (err) {
        console.error("Error query:", err);
        return;
    }
    console.log("USERS IN LOCAL DB:");
    console.table(rows);
    db.close();
});
