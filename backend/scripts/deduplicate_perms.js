const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database/business.db');

db.serialize(() => {
    console.log("Starting Permissions Deduplication...");

    // Create a temp table with distinct permissions
    db.run(`
        CREATE TABLE permissions_new AS
        SELECT * FROM permissions
        WHERE id IN (
            SELECT MAX(id)
            FROM permissions
            GROUP BY role_id, module
        )
    `, (err) => {
        if (err) {
            console.error("Error creating temp table:", err.message);
            return;
        }

        console.log("Temp table created with distinct records.");

        // Drop old table
        db.run("DROP TABLE permissions", (err2) => {
            if (err2) {
                console.error("Error dropping old table:", err2.message);
                return;
            }

            // Rename new table to permissions
            db.run("ALTER TABLE permissions_new RENAME TO permissions", (err3) => {
                if (err3) {
                    console.error("Error renaming table:", err3.message);
                } else {
                    console.log("SUCCESS: Permissions table deduplicated!");
                    // Check count now
                    db.get("SELECT COUNT(*) as count FROM permissions", (e, row) => {
                        console.log("Total unique permissions now:", row.count);
                    });
                }
                db.close();
            });
        });
    });
});
