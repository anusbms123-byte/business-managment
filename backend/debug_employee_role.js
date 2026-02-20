const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/database/business.db');

db.serialize(() => {
    // Check 'employee' role (from user's recent request)
    console.log("--- SEARCHING FOR 'employee' ROLE ---");
    db.get("SELECT * FROM roles WHERE name = 'employee'", (err, role) => {
        if (err) return console.error(err);
        if (!role) return console.log("Role 'employee' not found.");

        console.log("Role Details:", JSON.stringify(role, null, 2));

        const localId = role.id;
        const globalId = role.global_id;

        console.log(`\n--- PERMISSIONS FOR Role ID ${localId} / ${globalId} ---`);
        db.all("SELECT id, role_id, module, sync_status FROM permissions WHERE role_id = ? OR role_id = ? OR role_id = ?", [String(localId), globalId, localId], (err, perms) => {
            if (err) return console.error(err);
            console.log(`Found ${perms.length} permissions.`);
            perms.forEach(p => {
                console.log(` - ID: ${p.id}, RoleID: ${p.role_id} (type: ${typeof p.role_id}), Module: ${p.module}, Sync: ${p.sync_status}`);
            });

            // Check if there are any other permissions in the system at all
            db.get("SELECT COUNT(*) as total FROM permissions", (err, count) => {
                console.log(`\nTotal permissions in DB: ${count.total}`);
                db.close();
            });
        });
    });
});
