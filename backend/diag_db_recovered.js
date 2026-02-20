const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'business_recovered.db');
console.log('Checking database at:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err);
        process.exit(1);
    }
});

db.get('PRAGMA integrity_check;', (err, row) => {
    if (err) {
        console.error('Integrity check failed with error:', err);
    } else {
        console.log('Integrity check result:', row);
    }
    db.close();
});
