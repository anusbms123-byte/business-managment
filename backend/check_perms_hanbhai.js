const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'business.db');
const db = new sqlite3.Database(dbPath);

console.log("Permissions for role 'han bhai':");

db.all(`
    SELECT r.name as role_name, p.module, p.can_view, p.can_create, p.can_edit, p.can_delete
    FROM roles r
    JOIN permissions p ON r.global_id = p.role_id OR CAST(r.id AS TEXT) = p.role_id
    WHERE r.name = 'han bhai'
    AND (p.can_view = 1 OR p.can_create = 1 OR p.can_edit = 1 OR p.can_delete = 1)
    ORDER BY p.module
`, (err, rows) => {
    if (err) {
        console.error("Error querying database:", err);
        return;
    }

    if (rows.length === 0) {
        console.log("No permissions found for role 'han bhai'.");
    } else {
        rows.forEach(row => {
            const perms = [];
            if (row.can_view === 1) perms.push("View");
            if (row.can_create === 1) perms.push("Create");
            if (row.can_edit === 1) perms.push("Edit");
            if (row.can_delete === 1) perms.push("Delete");
            console.log(`- ${row.module}: ${perms.join(", ")}`);
        });
    }
    db.close();
});
