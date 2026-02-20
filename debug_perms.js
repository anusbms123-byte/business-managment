const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const os = require('os');

// Path to your local database
const dbPath = path.join('e:', 'bms-system', 'backend', 'database', 'bms.db');

const db = new sqlite3.Database(dbPath);

console.log("Checking Roles and Permissions...");

db.all("SELECT id, global_id, name FROM roles WHERE sync_status != 'deleted'", [], (err, roles) => {
    if (err) {
        console.error("Error fetching roles:", err);
        return;
    }

    console.log(`Found ${roles.length} roles.`);

    roles.forEach(role => {
        const roleId = role.global_id || role.id;
        db.all("SELECT * FROM permissions WHERE role_id = ?", [String(roleId)], (pErr, perms) => {
            if (pErr) {
                console.error(`Error fetching perms for role ${role.name}:`, pErr);
                return;
            }
            console.log(`\nRole: ${role.name} (${roleId})`);
            console.log(`Total Permission Rows: ${perms.length}`);
            const active = perms.filter(p => p.can_view === 1);
            console.log(`Modules with View Permission: ${active.length}`);
            active.forEach(p => {
                console.log(` - ${p.module}: [V:${p.can_view}, C:${p.can_create}, E:${p.can_edit}, D:${p.can_delete}]`);
            });

            if (perms.length > 0 && active.length === perms.length && perms.length === 15) {
                console.log("!!! ALERT: This role has ALL 15 modules enabled for View !!!");
            }
        });
    });
});
