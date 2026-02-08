const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../database/business.db');
const db = new sqlite3.Database(dbPath);

console.log('🧹 Cleaning up duplicate roles...');

// Helper to run query as promise
function runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

function getQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

async function cleanRoles() {
    try {
        // 1. Get legacy roles (global_id IS NULL)
        const oldRoles = await getQuery("SELECT * FROM roles WHERE global_id IS NULL");
        console.log(`Found ${oldRoles.length} old roles to be removed.`);

        // 2. Get new valid roles (global_id IS NOT NULL)
        const newRoles = await getQuery("SELECT * FROM roles WHERE global_id IS NOT NULL");

        // Map role name to new global_id for easy lookup
        const roleMap = {};
        newRoles.forEach(r => {
            if (r.name) roleMap[r.name.toLowerCase()] = r.global_id;
        });

        // 3. Update users who depend on old roles
        // Since local users table stores 'role' (name) and 'role_id', let's fix any users with null role_id
        console.log('Fixing users with null role_id...');
        const users = await getQuery("SELECT * FROM users WHERE role_id IS NULL");

        let usersFixed = 0;
        for (const user of users) {
            if (user.role) {
                const targetRoleId = roleMap[user.role.toLowerCase()];
                if (targetRoleId) {
                    await runQuery("UPDATE users SET role_id = ? WHERE id = ?", [targetRoleId, user.id]);
                    //    console.log(`  - Updated user '${user.username}' (${user.role}) -> ${targetRoleId}`);
                    usersFixed++;
                } else {
                    console.log(`  - Warning: No matching new role found for user '${user.username}' (role: ${user.role})`);
                }
            }
        }
        console.log(`Fixed ${usersFixed} users.`);

        // 4. Delete the old duplicate roles
        console.log('Deleting old duplicate roles...');
        const deleteRes = await runQuery("DELETE FROM roles WHERE global_id IS NULL");
        console.log(`Deleted ${deleteRes.changes} roles.`);

        // 5. Also delete permissions associated with old roles (role_id being numeric)
        // Check if role_id column in permissions is numeric (old) vs string (new global_id)
        // Safe bet: Delete any permission where role_id is not in the new global_ids list
        const validRoleIds = newRoles.map(r => r.global_id);
        if (validRoleIds.length > 0) {
            // SQLite doesn't support arrays directly in params easily, construct string
            const placeholders = validRoleIds.map(() => '?').join(',');
            const delPerms = await runQuery(`DELETE FROM permissions WHERE role_id NOT IN (${placeholders})`, validRoleIds);
            console.log(`Deleted ${delPerms.changes} orphaned permissions (using old numeric IDs).`);
        }

        console.log('✅ Cleanup complete! Duplicate roles should be gone.');

    } catch (error) {
        console.error('Error during cleanup:', error);
    } finally {
        db.close();
    }
}

cleanRoles();
