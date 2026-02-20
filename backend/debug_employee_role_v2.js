const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/database/business.db');
const fs = require('fs');

db.serialize(() => {
    db.get("SELECT * FROM roles WHERE name = 'employee'", (err, role) => {
        let output = "";
        if (err) output += err.message + "\n";
        else if (!role) output += "Role 'employee' not found.\n";
        else {
            output += `Role: ${role.name}, ID: ${role.id}, GID: ${role.global_id}\n`;
            db.all("SELECT id, role_id, module, sync_status FROM permissions WHERE role_id = ? OR role_id = ?", [String(role.id), role.global_id], (err, perms) => {
                if (err) output += err.message + "\n";
                else {
                    output += `Total Perms: ${perms.length}\n`;
                    perms.forEach(p => {
                        output += ` - ID: ${p.id}, RoleID: ${p.role_id}, Module: ${p.module}, Sync: ${p.sync_status}\n`;
                    });
                }
                fs.writeFileSync('e:/bms-system/backend/debug_output.txt', output);
                db.close();
            });
        }
    });
});
