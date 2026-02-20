const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/database/business.db');

db.serialize(() => {
    db.all("SELECT id, module FROM permissions WHERE global_id = ''", (err, rows) => {
        if (err) console.error(err);
        else console.log("Empty global_id records:", rows);
    });

    db.all("SELECT global_id, count(*) as c FROM permissions GROUP BY global_id HAVING c > 1", (err, rows) => {
        if (err) console.error(err);
        else console.log("Duplicate global_ids (including NULL if grouped):", rows);
    });

    db.close();
});
