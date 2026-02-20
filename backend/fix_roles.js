
const db = require('./database/db_manager');
const { randomUUID } = require('crypto');

const modules = [
    'dashboard', 'sales', 'purchase', 'returns', 'products', 'inventory',
    'customers', 'suppliers', 'expenses', 'reports', 'hrm', 'accounting',
    'users', 'roles', 'settings', 'backup'
];

async function fixRoles() {
    console.log("Starting Role & Permission Fix...");

    return new Promise((resolve, reject) => {
        db.serialize(async () => {
            try {
                // 1. Fix all 'Admin' roles (Case-insensitive) to have full permissions for ALL modules
                db.all("SELECT id, global_id, name FROM roles WHERE LOWER(name) = 'admin'", async (err, roles) => {
                    if (err) return reject(err);
                    console.log(`Found ${roles.length} Admin roles to fix.`);

                    for (const role of roles) {
                        const roleId = role.global_id || role.id;
                        console.log(`Fixing permissions for ${role.name} (${roleId})...`);

                        for (const mod of modules) {
                            const gid = randomUUID();
                            await new Promise(r => {
                                db.run(`
                                    INSERT INTO permissions (global_id, role_id, module, can_view, can_create, can_edit, can_delete, sync_status, updated_at)
                                    VALUES (?, ?, ?, 1, 1, 1, 1, 'pending', CURRENT_TIMESTAMP)
                                    ON CONFLICT(role_id, module) DO UPDATE SET
                                        can_view=1, can_create=1, can_edit=1, can_delete=1, 
                                        sync_status='pending', updated_at=CURRENT_TIMESTAMP
                                `, [gid, roleId, mod], () => r());
                            });
                        }

                        // Mark role itself as pending
                        db.run("UPDATE roles SET sync_status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [role.id]);
                    }
                    console.log("Admin roles fixed.");

                    // 2. Fix 'Super Admin' role
                    const superAdminGid = 'system-super-admin';
                    const superAdminModules = ['users', 'roles', 'settings', 'backup'];

                    console.log("Ensuring Super Admin has correct restricted permissions...");

                    // Clear all existing perms for super admin set to 0 first, then set selected ones to 1
                    for (const mod of modules) {
                        const val = superAdminModules.includes(mod) ? 1 : 0;
                        const gid = randomUUID();
                        await new Promise(r => {
                            db.run(`
                                INSERT INTO permissions (global_id, role_id, module, can_view, can_create, can_edit, can_delete, sync_status, updated_at)
                                VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)
                                ON CONFLICT(role_id, module) DO UPDATE SET
                                    can_view=excluded.can_view, can_create=excluded.can_create, 
                                    can_edit=excluded.can_edit, can_delete=excluded.can_delete,
                                    sync_status='pending', updated_at=CURRENT_TIMESTAMP
                            `, [gid, superAdminGid, mod, val, val, val, val], () => r());
                        });
                    }
                    console.log("Super Admin role fixed.");

                    resolve();
                });
            } catch (e) {
                reject(e);
            }
        });
    });
}

fixRoles()
    .then(() => {
        console.log("Fix completed. Please restart the app or trigger a sync.");
        process.exit(0);
    })
    .catch(err => {
        console.error("Fix failed:", err);
        process.exit(1);
    });
