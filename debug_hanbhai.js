const db = require('./backend/database/db_manager');
const roleName = "han bhai";

db.get("SELECT id, global_id FROM roles WHERE name = ?", [roleName], (err, role) => {
    if (err || !role) {
        console.error("Role not found", err);
        process.exit(1);
    }
    console.log(`Checking permissions for Role: ${roleName} (ID: ${role.id}, GID: ${role.global_id})`);

    db.all("SELECT * FROM permissions WHERE role_id = ? OR role_id = ?", [role.id, role.global_id], (err, rows) => {
        if (err) {
            console.error(err);
            process.exit(1);
        }
        console.log(`TOTAL_COUNT_LOCAL: ${rows.length}`);
        rows.forEach(r => {
            console.log(`- Module: ${r.module}, View: ${r.can_view}, Create: ${r.can_create}, Edit: ${r.can_edit}, Delete: ${r.can_delete}, Sync: ${r.sync_status}`);
        });
        process.exit(0);
    });
});
