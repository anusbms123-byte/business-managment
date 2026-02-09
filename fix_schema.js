const db = require('./backend/database/db_manager');

db.serialize(() => {
    // Customers Table Changes
    console.log("Checking customers table...");
    db.run("ALTER TABLE customers ADD COLUMN opening_balance REAL DEFAULT 0", (err) => {
        if (err && !err.message.includes("duplicate column")) {
            console.error("Error adding opening_balance to customers:", err.message);
        } else {
            console.log("✓ Added opening_balance to customers");
        }
    });

    // Vendors Table Changes
    console.log("Checking vendors table...");
    db.run("ALTER TABLE vendors ADD COLUMN city TEXT", (err) => {
        if (err && !err.message.includes("duplicate column")) console.error("Error adding city to vendors:", err.message);
        else console.log("✓ Added city to vendors");
    });

    db.run("ALTER TABLE vendors ADD COLUMN gst_no TEXT", (err) => {
        if (err && !err.message.includes("duplicate column")) console.error("Error adding gst_no to vendors:", err.message);
        else console.log("✓ Added gst_no to vendors");
    });

    db.run("ALTER TABLE vendors ADD COLUMN company_name TEXT", (err) => {
        if (err && !err.message.includes("duplicate column")) console.error("Error adding company_name to vendors:", err.message);
        else console.log("✓ Added company_name to vendors");
    });

    db.run("ALTER TABLE vendors ADD COLUMN opening_balance REAL DEFAULT 0", (err) => {
        if (err && !err.message.includes("duplicate column")) console.error("Error adding opening_balance to vendors:", err.message);
        else console.log("✓ Added opening_balance to vendors");
    });
});
