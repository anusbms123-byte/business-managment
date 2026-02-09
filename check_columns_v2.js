const db = require('./backend/database/db_manager');

db.serialize(() => {
    db.all("PRAGMA table_info(customers)", [], (err, rows) => {
        if (err) console.error(err);
        else console.log("CUSTOMERS columns:", rows.map(r => r.name).join(', '));
    });

    db.all("PRAGMA table_info(vendors)", [], (err, rows) => {
        if (err) console.error(err);
        else console.log("VENDORS columns:", rows.map(r => r.name).join(', '));
    });
});
