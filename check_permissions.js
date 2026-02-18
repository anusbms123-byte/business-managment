const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'backend', 'database', 'business.db');
const db = new sqlite3.Database(dbPath);

console.log("Checking Roles and Permissions in Local Database...");

db.all(`
    SELECT r.name as role_name, p.module, p.can_view, p.can_create, p.can_edit, p.can_delete
    FROM roles r
    LEFT JOIN permissions p ON r.global_id = p.role_id OR CAST(r.id AS TEXT) = p.role_id
    ORDER BY r.name, p.module
`, (err, rows) => {
    if (err) {
        console.error("Error querying database:", err);
        return;
    }

    if (rows.length === 0) {
        console.log("No roles or permissions found.");
    } else {
        let currentRole = "";
        rows.forEach(row => {
            if (row.role_name !== currentRole) {
                console.log(`\nRole: ${row.role_name}`);
                currentRole = row.role_name;
            }
            if (row.module) {
                const perms = [];
                if (row.can_view) perms.push("View");
                if (row.can_create) perms.push("Create");
                if (row.can_edit) perms.push("Edit");
                if (row.can_delete) perms.push("Delete");
                console.log(`  - Module: ${row.module} (${perms.join(", ") || "No Permissions"})`);
            } else {
                console.log(`  - No specific permissions found.`);
            }
        });
    }
    db.close();
});
