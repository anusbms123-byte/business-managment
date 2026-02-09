const db = require('./backend/database/db_manager');

db.all("PRAGMA table_info(customers)", [], (err, rows) => {
    if (err) {
        console.error("Error getting schema:", err);
        return;
    }
    console.log("Current columns in 'customers' table:");
    console.log(rows.map(r => r.name).join(', '));
});
