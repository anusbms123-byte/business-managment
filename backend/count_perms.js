const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'database', 'business.db');
const db = new sqlite3.Database(dbPath);

async function debug() {
    db.get("SELECT id, global_id FROM roles WHERE name = 'han bhai'", (err, role) => {
        if (!role) {
            console.log("Role not found");
            db.close();
            return;
        }
        console.log("Role:", role);
        db.all("SELECT * FROM permissions WHERE role_id = ? OR role_id = ?", [role.global_id, String(role.id)], (err, perms) => {
            console.log("Total Permissions for 'han bhai' count:", perms.length);
            const viewable = perms.filter(p => p.can_view === 1).map(p => p.module);
            console.log("Viewable modules:", [...new Set(viewable)]);
            console.log("Total unique viewable modules:", new Set(viewable).size);
            db.close();
        });
    });
}
debug();
