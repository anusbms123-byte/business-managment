const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'database', 'business.db'));

const allModules = [
    'dashboard', 'sales', 'purchase', 'returns', 'products', 'inventory',
    'customers', 'suppliers', 'expenses', 'reports', 'hrm', 'accounting',
    'users', 'roles', 'settings', 'backup'
];

db.serialize(() => {
    // Admin global template (no company_id = NULL)
    db.run(
        `INSERT OR IGNORE INTO roles (global_id, name, description, company_id, sync_status, is_system, updated_at)
         VALUES (?, ?, ?, ?, 'synced', 1, CURRENT_TIMESTAMP)`,
        ['system-admin-template', 'Admin', 'Full company access (Global Template)', null],
        function (err) {
            if (err) console.log('Admin role error:', err.message);
            else console.log('[SEED] Admin template inserted (or already exists)');
        }
    );

    // Manager global template (no company_id = NULL)
    db.run(
        `INSERT OR IGNORE INTO roles (global_id, name, description, company_id, sync_status, is_system, updated_at)
         VALUES (?, ?, ?, ?, 'synced', 1, CURRENT_TIMESTAMP)`,
        ['system-manager-template', 'Manager', 'Management level access (Global Template)', null],
        function (err) {
            if (err) console.log('Manager role error:', err.message);
            else console.log('[SEED] Manager template inserted (or already exists)');
        }
    );

    // Admin permissions (full access to all modules)
    allModules.forEach(mod => {
        db.run(
            `INSERT OR IGNORE INTO permissions (global_id, role_id, module, can_view, can_create, can_edit, can_delete, sync_status, updated_at)
             VALUES (?, 'system-admin-template', ?, 1, 1, 1, 1, 'synced', CURRENT_TIMESTAMP)`,
            ['perm-admin-tpl-' + mod, mod]
        );
    });
    console.log('[SEED] Admin permissions seeded');

    // Manager permissions (view all, write on key modules only)
    allModules.forEach(mod => {
        const canWrite = ['sales', 'customers', 'products', 'expenses', 'purchase', 'returns'].includes(mod) ? 1 : 0;
        db.run(
            `INSERT OR IGNORE INTO permissions (global_id, role_id, module, can_view, can_create, can_edit, can_delete, sync_status, updated_at)
             VALUES (?, 'system-manager-template', ?, 1, ?, ?, 0, 'synced', CURRENT_TIMESTAMP)`,
            ['perm-mgr-tpl-' + mod, mod, canWrite, canWrite]
        );
    });
    console.log('[SEED] Manager permissions seeded');

    // Verify
    setTimeout(() => {
        db.all(
            `SELECT name, company_id, is_system, global_id FROM roles WHERE global_id IN ('system-admin-template','system-manager-template')`,
            [],
            (err, rows) => {
                console.log('\n[VERIFY] Global templates in DB:');
                console.log(JSON.stringify(rows, null, 2));
                db.close();
            }
        );
    }, 600);
});
