const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'database', 'business.db');
const db = new sqlite3.Database(dbPath);

console.log("Checking permission counts for all roles...");

db.all("SELECT r.id, r.name, r.global_id, COUNT(p.id) as perm_count FROM roles r LEFT JOIN permissions p ON p.role_id = r.id OR p.role_id = r.global_id GROUP BY r.id", (err, roles) => {
    if (err) {
        console.error(err);
        db.close();
        return;
    }
    roles.forEach(role => {
        console.log(`Role: ${role.name} (ID: ${role.id}, GID: ${role.global_id}) - Count: ${role.perm_count}`);
        if (role.perm_count < 15) {
            console.log(`  Missing ${15 - role.perm_count} permissions!`);
        }
    });
    db.close();
});
