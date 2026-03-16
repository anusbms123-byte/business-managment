const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'database', 'business.db'));

db.serialize(() => {
    console.log('[SEED] Cleaning up old templates...');
    
    // Explicitly remove seeded templates to prevent duplication with cloud roles
    db.run("DELETE FROM roles WHERE global_id IN ('system-admin-template', 'system-manager-template')");
    db.run("DELETE FROM permissions WHERE role_id IN ('system-admin-template', 'system-manager-template')");

    console.log('[SEED] Done. Only cloud/manually created roles will persist.');
    db.close();
});
