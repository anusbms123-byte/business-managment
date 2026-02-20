const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/database/business.db');

const testRaceCondition = async () => {
    const roleName = "race-test-" + Date.now();
    const permissions = Array.from({ length: 15 }, (v, i) => ({ module: "m-" + i }));

    console.log(`Simulating main.js behavior for '${roleName}'...`);

    return new Promise((resolve) => {
        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            const tempId = "race-uuid-" + Date.now();

            db.run("INSERT INTO roles (global_id, name, sync_status) VALUES (?, ?, 'pending')", [tempId, roleName], function (err) {
                // This simulates the callback in main.js
                const stmt = db.prepare(`INSERT INTO permissions (role_id, module, sync_status) VALUES (?, ?, 'pending')`);

                permissions.forEach(p => {
                    stmt.run(tempId, p.module);
                });

                stmt.finalize();

                // IN main.js, COMMIT is called right after the loop/finalize
                db.run("COMMIT", (err) => {
                    if (err) console.error("Commit error:", err);
                    else console.log("Commit complete.");

                    // Delay check to see if all made it
                    setTimeout(() => {
                        db.all("SELECT count(*) as count FROM permissions WHERE role_id = ?", [tempId], (err, rows) => {
                            console.log("Count in DB:", rows[0].count);
                            db.close();
                            resolve();
                        });
                    }, 100);
                });
            });
        });
    });
};

testRaceCondition();
