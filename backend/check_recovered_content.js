const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'business_recovered.db');
const db = new sqlite3.Database(dbPath);

db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
    console.log('Users count in recovered:', row ? row.count : err);
    db.get('SELECT COUNT(*) as count FROM companies', (err, row) => {
        console.log('Companies count in recovered:', row ? row.count : err);
        db.get('SELECT COUNT(*) as count FROM products', (err, row) => {
            console.log('Products count in recovered:', row ? row.count : err);
            db.close();
        });
    });
});
