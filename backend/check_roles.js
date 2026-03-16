const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, 'database', 'business.db'));

db.all("SELECT id, global_id, name, description FROM roles WHERE (company_id IS NULL OR company_id = '')", [], (err, rows) => {
    if (err) {
        console.error(err);
    } else {
        console.log("Found " + rows.length + " Global Roles:");
        console.log(JSON.stringify(rows, null, 2));
    }
    db.close();
});
