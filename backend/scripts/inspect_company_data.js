const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../database/business.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Inspecting Data Distribution by Company...\n');

function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

(async () => {
    try {
        console.log('--- USERS by Company ---');
        const users = await run("SELECT company_id, count(*) as count FROM users GROUP BY company_id");
        console.table(users);

        console.log('\n--- ROLES by Company ---');
        const roles = await run("SELECT company_id, is_system, count(*) as count FROM roles GROUP BY company_id, is_system");
        console.table(roles);

        console.log('\n--- ALL USERS (First 20) ---');
        const allUsers = await run("SELECT id, username, company_id, role, role_id FROM users LIMIT 20");
        console.table(allUsers);

    } catch (err) {
        console.error(err);
    } finally {
        db.close();
    }
})();
