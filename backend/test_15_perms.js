const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/database/business.db');

const MODULES = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'sales', label: 'Sales' },
    { key: 'purchase', label: 'Purchase' },
    { key: 'returns', label: 'Returns' },
    { key: 'products', label: 'Products' },
    { key: 'inventory', label: 'Inventory' },
    { key: 'customers', label: 'Customers' },
    { key: 'suppliers', label: 'Suppliers' },
    { key: 'expenses', label: 'Expenses' },
    { key: 'reports', label: 'Reports' },
    { key: 'hrm', label: 'HRM' },
    { key: 'accounting', label: 'Accounting' },
    { key: 'users', label: 'Users' },
    { key: 'settings', label: 'Settings' },
    { key: 'backup', label: 'Backup' },
];

const testRoleUpdate = async () => {
    const roleName = "test-role-15";
    const permissions = MODULES.map(m => ({
        module: m.key,
        can_view: 1, can_create: 1, can_edit: 1, can_delete: 1
    }));

    console.log(`Testing role creation for '${roleName}' with ${permissions.length} permissions...`);

    return new Promise((resolve) => {
        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            const tempId = "test-uuid-" + Date.now();

            db.run("INSERT INTO roles (global_id, name, sync_status) VALUES (?, ?, 'pending')", [tempId, roleName], function (err) {
                if (err) {
                    db.run("ROLLBACK");
                    return resolve(err);
                }

                const stmt = db.prepare(`INSERT INTO permissions (role_id, module, can_view, can_create, can_edit, can_delete, sync_status) 
                                         VALUES (?, ?, ?, ?, ?, ?, 'pending')`);

                permissions.forEach(p => {
                    stmt.run(tempId, p.module, 1, 1, 1, 1);
                });

                stmt.finalize();

                db.run("COMMIT", (err) => {
                    if (err) console.error("Commit error:", err);
                    else console.log("Success! Checking perms count...");

                    db.all("SELECT count(*) as count FROM permissions WHERE role_id = ?", [tempId], (err, rows) => {
                        console.log("Count in DB for test role:", rows[0].count);
                        db.close();
                        resolve();
                    });
                });
            });
        });
    });
};

testRoleUpdate();
