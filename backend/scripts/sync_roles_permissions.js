/**
 * This script manually pulls roles, permissions, and updates user role_ids
 * from the cloud server to fix offline permission issues
 */

const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to the local database directly
const dbPath = path.join(__dirname, '../database/business.db');
const db = new sqlite3.Database(dbPath);

// Cloud server URL (can be changed via environment variable)
const CLOUD_URL = process.env.CLOUD_URL || 'https://businessdevelopment-ten.vercel.app/api';

console.log('🔄 Starting manual sync of roles and permissions...\n');
console.log(`Using cloud server: ${CLOUD_URL}\n`);

// Helper functions to promisify database operations
function dbAll(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function dbGet(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function dbRun(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

async function syncRolesAndPermissions() {
    try {
        // Step 1: Get all companies
        console.log('📋 Fetching companies from local database...');
        const companies = await dbAll("SELECT global_id, name FROM companies WHERE global_id IS NOT NULL");
        console.log(`Found ${companies.length} companies in local database\n`);

        for (const company of companies) {
            const companyId = company.global_id;
            console.log(`\n━━━ Syncing Company: ${company.name} (${companyId}) ━━━`);

            // Step 2: Pull roles for this company from cloud
            try {
                console.log(`  📥 Fetching roles from cloud...`);
                const rolesResponse = await axios.get(`${CLOUD_URL}/roles?companyId=${companyId}`);
                const cloudRoles = rolesResponse.data;
                console.log(`  ✓ Found ${cloudRoles.length} cloud roles`);

                // Save roles to local database
                for (const role of cloudRoles) {
                    await dbRun(
                        `INSERT OR REPLACE INTO roles (global_id, name, description, company_id, is_system, sync_status) 
                         VALUES (?, ?, ?, ?, ?, 'synced')`,
                        [role.id, role.name, role.description, role.companyId, role.isSystem ? 1 : 0]
                    );
                    console.log(`    • Saved role: ${role.name} (ID: ${role.id})`);
                }
            } catch (roleError) {
                console.log(`  ⚠️  Could not fetch roles: ${roleError.message}`);
            }

            // Step 3: Pull permissions for this company from cloud
            try {
                console.log(`\n  📥 Fetching permissions from cloud...`);
                const permsResponse = await axios.get(`${CLOUD_URL}/permissions?companyId=${companyId}`);
                const cloudPermissions = permsResponse.data;
                console.log(`  ✓ Found ${cloudPermissions.length} cloud permissions`);

                // Save permissions to local database
                for (const perm of cloudPermissions) {
                    await dbRun(
                        `INSERT OR REPLACE INTO permissions (global_id, role_id, module, can_view, can_create, can_edit, can_delete, sync_status) 
                         VALUES (?, ?, ?, ?, ?, ?, ?, 'synced')`,
                        [
                            perm.id,
                            perm.roleId,  // This is the global_id of the role
                            perm.module,
                            perm.canView ? 1 : 0,
                            perm.canCreate ? 1 : 0,
                            perm.canEdit ? 1 : 0,
                            perm.canDelete ? 1 : 0
                        ]
                    );
                }
                console.log(`    • Saved ${cloudPermissions.length} permissions`);
            } catch (permError) {
                console.log(`  ⚠️  Could not fetch permissions: ${permError.message}`);
            }

            // Step 4: Pull users and update their role_id
            try {
                console.log(`\n  📥 Fetching users from cloud...`);
                const usersResponse = await axios.get(`${CLOUD_URL}/users?companyId=${companyId}`);
                const cloudUsers = usersResponse.data;
                console.log(`  ✓ Found ${cloudUsers.length} cloud users`);

                // Update users with correct role_id
                for (const user of cloudUsers) {
                    await dbRun(
                        `UPDATE users SET role_id = ? WHERE global_id = ?`,
                        [user.role_id, user.id]
                    );
                    console.log(`    • Updated user: ${user.username} -> role_id: ${user.role_id}`);
                }
            } catch (userError) {
                console.log(`  ⚠️  Could not fetch users: ${userError.message}`);
            }
        }

        console.log('\n\n✅ Manual sync completed successfully!');
        console.log('\n📊 Summary:');

        const roleCount = await dbGet("SELECT COUNT(*) as count FROM roles");
        const permCount = await dbGet("SELECT COUNT(*) as count FROM permissions");
        const usersWithRoles = await dbGet("SELECT COUNT(*) as count FROM users WHERE role_id IS NOT NULL");

        console.log(`   • Total roles: ${roleCount.count}`);
        console.log(`   • Total permissions: ${permCount.count}`);
        console.log(`   • Users with role_id: ${usersWithRoles.count}`);

        db.close();
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error during sync:', error.message);
        if (error.code === 'ENOTFOUND') {
            console.error('\n💡 Hint: Could not connect to cloud server. Please check:');
            console.error('   1. Your internet connection');
            console.error('   2. The cloud server URL is correct');
            console.error(`   3. Current URL: ${CLOUD_URL}`);
        }
        db.close();
        process.exit(1);
    }
}

// Run the sync
syncRolesAndPermissions();
