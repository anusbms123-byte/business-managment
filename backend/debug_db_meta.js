const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/database/business.db');

db.serialize(() => {
    db.all("SELECT name, sql FROM sqlite_master WHERE type='trigger'", (err, rows) => {
        if (err) console.error(err);
        else console.log("Triggers:", JSON.stringify(rows, null, 2));
    });

    db.all("SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='permissions'", (err, rows) => {
        if (err) console.error(err);
        else console.log("Indices on permissions:", JSON.stringify(rows, null, 2));
    });

    db.close();
});
