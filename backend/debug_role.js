const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'business.db');
const db = new sqlite3.Database(dbPath);

db.get("SELECT * FROM roles WHERE name = 'han bhai'", (err, row) => {
    if (err) {
        console.error(err);
    } else {
        console.log("Role 'han bhai' Local Data:");
        console.log(JSON.stringify(row, null, 2));
    }
    db.close();
});
