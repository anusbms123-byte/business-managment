const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/database/business.db');

const testRoleUpdate = async () => {
    const roleName = "test-role-err-" + Date.now();
    const permissions = Array.from({ length: 15 }, (v, i) => ({
        module: "module-" + i,
        v: 1, c: 1, e: 1, d: 1
    }));

    console.log(`Testing role creation for '${roleName}' with ${permissions.length} permissions...`);

    return new Promise((resolve) => {
        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            const tempId = "test-uuid-" + Date.now();

            db.run("INSERT INTO roles (global_id, name, sync_status) VALUES (?, ?, 'pending')", [tempId, roleName], function (err) {
                if (err) {
                    console.error("Role Insert Error:", err);
                    db.run("ROLLBACK");
                    return resolve();
                }

                const stmt = db.prepare(`INSERT INTO permissions (role_id, module, can_view, can_create, can_edit, can_delete, sync_status) 
                                         VALUES (?, ?, ?, ?, ?, ?, 'pending')`);

                let completed = 0;
                permissions.forEach((p, idx) => {
                    stmt.run(tempId, p.module, 1, 1, 1, 1, function (err) {
                        completed++;
                        if (err) console.error(`Perm Insert Error [${idx}]:`, err.message);
                        if (completed === permissions.length) {
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
                        }
                    });
                });
            });
        });
    });
};

testRoleUpdate();
