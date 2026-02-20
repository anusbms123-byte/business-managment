const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'rms.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err);
        return;
    }
    db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
        console.log('Users count in rms:', row ? row.count : err);
        db.close();
    });
});
