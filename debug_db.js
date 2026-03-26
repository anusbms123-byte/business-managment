const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('e:/bms-system/backend/database.sqlite');
db.all("SELECT name, created_at, updated_at, stock_quantity FROM products", [], (err, rows) => {
    if (err) console.error(err);
    else console.log(JSON.stringify(rows, null, 2));
    db.close();
});
