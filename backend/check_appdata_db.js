const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.argv[2];
if (!dbPath) {
    console.error("No DB path provided");
    process.exit(1);
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Connection error:", err);
        process.exit(1);
    }
});

db.asyncAll = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

async function check() {
    try {
        const companies = await db.asyncAll("SELECT id, name, global_id, sync_status, is_active FROM companies");
        const users = await db.asyncAll("SELECT id, username, role, company_id, sync_status, is_active FROM users");
        
        console.log("Database path:", dbPath);
        console.log("Companies count:", companies.length);
        console.log("Companies:", JSON.stringify(companies, null, 2));
        
        console.log("Users count:", users.length);
        console.log("Users:", JSON.stringify(users, null, 2));
    } catch (err) {
        console.error("Error:", err);
    } finally {
        db.close();
        process.exit();
    }
}

check();
