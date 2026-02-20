const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'database', 'business.db');
const db = new sqlite3.Database(dbPath);

console.log("Checking DB at:", dbPath);

db.all("SELECT id, global_id, name, company_id, is_system, sync_status FROM roles", (err, rows) => {
    if (err) {
        console.error(err);
    } else {
        console.log("Roles table content:");
        console.log(JSON.stringify(rows, null, 2));
    }

    db.all("SELECT id, name, company_id, is_system FROM roles", (err, rows) => {
        if (err) {
            console.error(err);
        } else {
            console.log("All Roles:");
            console.log(JSON.stringify(rows, null, 2));
        }
        db.close();
    });
});
