const db = require('./backend/database/db_manager');

db.serialize(() => {
    console.log("Adding missing columns to purchases table...");

    const columns = [
        "ALTER TABLE purchases ADD COLUMN shipping_cost REAL DEFAULT 0",
        "ALTER TABLE purchases ADD COLUMN discount REAL DEFAULT 0"
    ];

    columns.forEach(sql => {
        db.run(sql, (err) => {
            if (err && !err.message.includes("duplicate column")) {
                console.error("Error updating purchases:", err.message);
            } else {
                console.log("✓ Updated purchases table schema");
            }
        });
    });
});
