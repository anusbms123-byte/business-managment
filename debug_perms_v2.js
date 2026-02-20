const db = require('./backend/database/db_manager');
const roleName = "han bhai";

db.get("SELECT id, global_id FROM roles WHERE name = ?", [roleName], (err, role) => {
    if (err || !role) {
        console.log("ROLE_NOT_FOUND");
        process.exit(1);
    }

    console.log(`ROLE_INFO: ID=${role.id}, GID=${role.global_id}`);

    db.all("SELECT * FROM permissions WHERE role_id = ? OR role_id = ?", [String(role.id), String(role.global_id)], (err, rows) => {
        if (err) {
            console.log("DB_ERROR: " + err.message);
        } else {
            console.log(`TOTAL_PERMISSIONS: ${rows.length}`);
            rows.forEach((r, i) => {
                console.log(`PERM_${i}: module=${r.module}, view=${r.can_view}, sync=${r.sync_status}`);
            });
        }
        process.exit(0);
    });
});
