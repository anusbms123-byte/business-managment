const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/database/business.db');

db.serialize(() => {
    // 1. Get the role
    db.get("SELECT * FROM roles WHERE name = 'employee'", (err, role) => {
        if (!role) return db.close();
        console.log("Role:", role);

        // 2. Check permissions in local DB
        db.all("SELECT id, role_id, module, global_id, sync_status FROM permissions WHERE role_id = ? OR role_id = ? OR role_id = ?",
            [String(role.id), role.global_id, role.id], (err, rows) => {
                console.log(`Found ${rows.length} perms for this role.`);

                // 3. Search for ANY permissions that might belong to this role but have a different role_id
                db.all("SELECT role_id, COUNT(*) as count FROM permissions GROUP BY role_id", (err, counts) => {
                    console.log("All role_id clusters in permissions table:", counts);
                    db.close();
                });
            });
    });
});
