const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/database/business.db');

db.all("SELECT id, global_id, name, company_id, is_system FROM roles", (err, rows) => {
    if (err) {
        console.error(err);
    } else {
        console.log("Roles table content:");
        console.table(rows);
    }

    db.all("SELECT * FROM users", (err, rows) => {
        if (err) {
            console.error(err);
        } else {
            console.log("Users table content:");
            console.table(rows);
        }
        db.close();
    });
});
