const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/database/business.db');

db.serialize(() => {
    db.all("PRAGMA index_list(permissions)", (err, rows) => {
        console.log("Indices:", rows);
        if (rows) {
            rows.forEach(idx => {
                db.all(`PRAGMA index_info(${idx.name})`, (err, info) => {
                    console.log(`Info for ${idx.name}:`, info);
                });
            });
        }
    });
});
