const db = require('./backend/database/db_manager');

const tables = ['purchases', 'employees', 'expenses', 'sales'];

db.serialize(() => {
    tables.forEach(table => {
        db.all(`PRAGMA table_info(${table})`, [], (err, rows) => {
            if (err) console.error(err);
            else console.log(`${table.toUpperCase()} columns:`, rows.map(r => r.name).join(', '));
        });
    });
});
