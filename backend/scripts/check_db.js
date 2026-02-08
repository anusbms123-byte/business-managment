const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'business.db');
const db = new sqlite3.Database(dbPath);

console.log("Checking database at:", dbPath);

db.serialize(() => {
    db.all("SELECT * FROM companies", (err, rows) => {
        if (err) {
            console.error("Error fetching companies:", err.message);
        } else {
            console.log("Companies:", rows);
        }
    });

    db.all("SELECT id, username, company_id, global_id FROM users", (err, rows) => {
        if (err) {
            console.error("Error fetching users:", err.message);
        } else {
            console.log("Users:", rows);
        }
    });
});

db.close();
