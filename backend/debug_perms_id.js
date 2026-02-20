const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/database/business.db');

db.serialize(() => {
    console.log("--- CHECKING FOR DUPLICATE GLOBAL_IDs IN permissions ---");
    db.all("SELECT global_id, COUNT(*) as count FROM permissions WHERE global_id IS NOT NULL GROUP BY global_id HAVING count > 1", (err, rows) => {
        if (err) console.error(err);
        else console.log("Duplicates:", rows);
    });

    console.log("\n--- CHECKING FOR NULL GLOBAL_IDs ---");
    db.all("SELECT COUNT(*) as count FROM permissions WHERE global_id IS NULL", (err, rows) => {
        if (err) console.error(err);
        else console.log("NULL global_ids count:", rows[0].count);
    });

    db.close();
});
