const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to the local database
const dbPath = path.join(__dirname, '../database/business.db');
const db = new sqlite3.Database(dbPath);

console.log('='.repeat(60));
console.log('DATABASE INSPECTION - Roles & Permissions');
console.log('='.repeat(60));

// 1. Check Roles
console.log('\n📋 ROLES TABLE:');
db.all("SELECT * FROM roles", [], (err, rows) => {
    if (err) {
        console.error("❌ Error fetching roles:", err);
    } else {
        console.log(`Found ${rows.length} role(s):`);
        rows.forEach((row, idx) => {
            console.log(`  ${idx + 1}. ID: ${row.id}, Global ID: ${row.global_id}, Name: ${row.name}, Company: ${row.company_id}, IsSystem: ${row.is_system}`);
        });
    }
});

// 2. Check Permissions
setTimeout(() => {
    console.log('\n🔐 PERMISSIONS TABLE:');
    db.all("SELECT * FROM permissions", [], (err, rows) => {
        if (err) {
            console.error("❌ Error fetching permissions:", err);
        } else {
            console.log(`Found ${rows.length} permission(s):`);
            rows.forEach((row, idx) => {
                console.log(`  ${idx + 1}. ID: ${row.id}, Global ID: ${row.global_id}, Role: ${row.role_id}, Module: ${row.module}`);
                console.log(`      View: ${row.can_view}, Create: ${row.can_create}, Edit: ${row.can_edit}, Delete: ${row.can_delete}`);
            });
        }
    });
}, 100);

// 3. Check Users
setTimeout(() => {
    console.log('\n👥 USERS TABLE:');
    db.all("SELECT id, global_id, username, role, role_id, company_id, fullname FROM users", [], (err, rows) => {
        if (err) {
            console.error("❌ Error fetching users:", err);
        } else {
            console.log(`Found ${rows.length} user(s):`);
            rows.forEach((row, idx) => {
                console.log(`  ${idx + 1}. ID: ${row.id}, Global ID: ${row.global_id}, Username: ${row.username}`);
                console.log(`      Role: ${row.role}, Role ID: ${row.role_id}, Company: ${row.company_id}`);
            });
        }
    });
}, 200);

// 4. Check Companies
setTimeout(() => {
    console.log('\n🏢 COMPANIES TABLE:');
    db.all("SELECT id, global_id, name FROM companies", [], (err, rows) => {
        if (err) {
            console.error("❌ Error fetching companies:", err);
        } else {
            console.log(`Found ${rows.length} company(ies):`);
            rows.forEach((row, idx) => {
                console.log(`  ${idx + 1}. ID: ${row.id}, Global ID: ${row.global_id}, Name: ${row.name}`);
            });
        }
    });
}, 300);

// 5. Test Permission Lookup (simulate offline login)
setTimeout(() => {
    console.log('\n🧪 TESTING PERMISSION LOOKUP:');

    db.get("SELECT * FROM users LIMIT 1", [], (err, user) => {
        if (err || !user) {
            console.error("❌ No users found for testing");
            db.close();
            return;
        }

        console.log(`Testing with user: ${user.username} (Role ID: ${user.role_id})`);

        db.all("SELECT * FROM permissions WHERE role_id = ?", [user.role_id], (permErr, permissions) => {
            if (permErr) {
                console.error("❌ Error fetching permissions:", permErr);
            } else {
                console.log(`✅ Found ${permissions.length} permissions for role ${user.role_id}:`);
                permissions.forEach((perm, idx) => {
                    console.log(`  ${idx + 1}. ${perm.module}: View=${perm.can_view}, Create=${perm.can_create}, Edit=${perm.can_edit}, Delete=${perm.can_delete}`);
                });
            }

            console.log('\n' + '='.repeat(60));
            console.log('INSPECTION COMPLETE');
            console.log('='.repeat(60) + '\n');

            db.close();
        });
    });
}, 400);
