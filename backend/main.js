const { app, BrowserWindow, ipcMain, dialog, Menu } = require("electron");
const { randomUUID } = require("crypto");


const { autoUpdater } = require("electron-updater");
const log = require("electron-log");

// Configure logging
log.transports.file.level = "info";
autoUpdater.logger = log;

// Auto-updater events
autoUpdater.on('checking-for-update', () => {
    log.info('Checking for update...');
});

autoUpdater.on('update-available', (info) => {
    log.info('Update available.');
    // Notify user that update is being downloaded
    dialog.showMessageBox({
        type: 'info',
        title: 'Update Found',
        message: `A new version (${info.version}) is available. It is downloading in the background. We will notify you when it's ready!`,
        buttons: ['OK']
    });
});

autoUpdater.on('update-not-available', (info) => {
    log.info('Update not available.');
});

autoUpdater.on('error', (err) => {
    log.error('Error in auto-updater. ' + err);
    // Explicitly notify user about the error if they are checking for updates
    // This helps debug issues like connectivity or missing release files
    if (app.isPackaged) {
        dialog.showErrorBox('Update Error', 'Could not check for updates. Please check your internet connection or try again later. Error: ' + err.message);
    }
});

autoUpdater.on('download-progress', (progressObj) => {
    let log_message = "Download speed: " + progressObj.bytesPerSecond;
    log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
    log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
    log.info(log_message);
});

autoUpdater.on('update-downloaded', (info) => {
    log.info('Update downloaded');
    dialog.showMessageBox({
        type: 'info',
        title: 'Update Ready',
        message: 'A new version of Business Management App is ready. Restart now to install?',
        buttons: ['Restart', 'Later']
    }).then((returnValue) => {
        if (returnValue.response === 0) {
            log.info('User chose to restart. Calling quitAndInstall(false, true)...');
            autoUpdater.quitAndInstall(false, true);
        } else {
            log.info('User chose to install later.');
        }
    });
});

const path = require("path");
const axios = require("axios");
const db = require("./database/db_manager");
const syncService = require("./services/sync_service");

const API_URL = syncService.CLOUD_URL;
let currentCompanyId = null;

// Helper: Generic API Call
async function apiCall(method, endpoint, data = null, params = null) {
    try {
        // Ensure endpoint starts with / and API_URL doesn't end with /
        const baseUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

        const response = await axios({
            method,
            url: `${baseUrl}${cleanEndpoint}`,
            data,
            params
        });
        return response.data;
    } catch (error) {
        const fullUrl = error.config?.url || `${API_URL}${endpoint}`;
        console.error(`API Error [${method} ${fullUrl}]:`, error.message);
        return { success: false, message: error.response?.data?.message || error.message };
    }
}

// Helper: Record Deletion for Sync
async function recordDeletion(tableName, globalId) {
    if (!globalId || globalId.includes('-')) return; // Don't sync temp IDs or nulls
    return new Promise((resolve) => {
        db.run("INSERT INTO pending_sync_deletions (table_name, global_id) VALUES (?, ?)", [tableName, globalId], () => {
            syncService.syncPendingRecords();
            resolve();
        });
    });
}

// Global variable to track currently logged-in company for auto-sync (undefined = not logged in, null = Super Admin)
let currentLoggedCompany = undefined;

// Setup Background Sync Timer (Every 5 minutes)
// - Pushes pending local changes to cloud
// - Pulls fresh data from cloud (if user is logged in)
setInterval(async () => {
    console.log("[AUTO-SYNC] Running scheduled sync (every 5 minutes)...");

    // Always push pending changes
    syncService.syncPendingRecords();

    // If a user is logged in (including Super Admin with null company), also pull fresh data
    if (currentLoggedCompany !== undefined) {
        console.log(`[AUTO-SYNC] Pulling fresh data for session: ${currentLoggedCompany === null ? 'Global (Super Admin)' : currentLoggedCompany}`);
        try {
            await syncService.pullAllData(currentLoggedCompany);
            console.log("[AUTO-SYNC] Data pull completed successfully");
        } catch (err) {
            console.error("[AUTO-SYNC] Data pull failed:", err.message);
        }
    } else {
        console.log("[AUTO-SYNC] No user logged in, skipping data pull");
    }
}, 300000); // 300,000ms = 5 minutes

// ==========================================
// IPC HANDLERS (PURE CLOUD BRIDGE)
// ==========================================

// Auth - LOCAL FIRST LOGIN (Cloud with local fallback)
ipcMain.handle("login", async (e, credentials) => {
    // Try cloud login first
    let cloudError = null;
    try {
        const response = await apiCall('post', '/auth/login', credentials);

        if (response.success && response.user) {
            // Cloud returned success. Let's resolve the user's company_id
            let companyId = response.user.company_id || response.user.companyId;

            // Ensure Super Admin is never tied to a specific company ID locally
            const isSuperAdmin = response.user.role === 'Super Admin' || response.user.role === 'SuperAdmin';
            if (isSuperAdmin) {
                companyId = null;
                console.log(`✓ Super Admin detected: Forcing null companyId.`);
            }

            // Check if user exists locally to preserve company_id (Only for non-super admins)
            const existing = await new Promise((resolve) => {
                db.get("SELECT id, company_id FROM users WHERE global_id = ? OR username = ?", [response.user.id, response.user.username], (err, row) => resolve(row));
            });

            if (!isSuperAdmin && existing && existing.company_id && (!companyId || companyId === 'null')) {
                companyId = existing.company_id;
                // Update response object for frontend
                response.user.company_id = companyId;
                response.user.companyId = companyId;
                console.log(`✓ Preserving local Company ID: ${companyId} for user ${response.user.username}`);
            }

            console.log(`Login successful for user ${response.user.username} (Company: ${companyId})`);

            // Update/Insert local user record
            if (existing) {
                const updateQuery = `
                    UPDATE users SET 
                        global_id = ?, 
                        password = ?, 
                        role = ?, 
                        role_id = ?, 
                        fullname = ?, 
                        company_id = ?, 
                        sync_status = 'synced' 
                    WHERE id = ?
                `;
                const updateParams = [
                    response.user.id,
                    credentials.password,
                    response.user.role,
                    response.user.role_id,
                    response.user.fullname,
                    isSuperAdmin ? null : companyId,
                    existing.id
                ];

                await new Promise((resolve) => db.run(updateQuery, updateParams, resolve));
                console.log(`✓ User ${response.user.username} (ID: ${existing.id}) records updated and synced with cloud ID.`);
            } else {
                await new Promise((resolve) => {
                    db.run(
                        `INSERT INTO users (global_id, username, password, role, role_id, fullname, company_id, sync_status, is_active) 
                         VALUES (?, ?, ?, ?, ?, ?, ?, 'synced', 1)`,
                        [response.user.id, response.user.username, credentials.password, response.user.role, response.user.role_id, response.user.fullname, companyId],
                        resolve
                    );
                });
                console.log(`✓ User ${response.user.username} created locally.`);
            }

            // Set global currentCompanyId for sync and other handlers
            if (companyId) {
                const isNewCompany = currentCompanyId !== companyId;
                currentCompanyId = companyId;
                currentLoggedCompany = companyId; // Track for auto-sync
                syncService.setCompanyId(companyId); // Update sync service with current session

                if (isNewCompany) {
                    console.log(`[LOGIN] New Company (${companyId}) detected. Clearing local cache for fresh pull...`);
                    // Use resetModules to clear Sales, Purchases, Users, etc. before pulling fresh
                    syncService.resetModules(companyId).then(result => {
                        console.log("✓ Module reset and fresh pull completed for new company session.");
                    }).catch(err => {
                        console.error("Failed to reset modules on login:", err.message);
                    });
                } else {
                    console.log(`[LOGIN] Same company (${companyId}). Triggering update pull...`);
                    syncService.pullAllData(companyId);
                }
            } else if (isSuperAdmin) {
                // If Super Admin, pull shared data
                currentLoggedCompany = null; // Super admin has no specific company
                console.log("Super Admin logged in. Pulling global data...");
                syncService.pullAllData(null);
            }

            return response;
        } else {
            cloudError = response.message;
            console.warn("Cloud login rejected:", cloudError);
        }
    } catch (err) {
        cloudError = err.message;
        console.error("Cloud login endpoint unreachable or error:", err.message);
    }

    // Offline Login Fallback (If cloud failed or rejected)
    return new Promise((resolve) => {
        db.get(
            "SELECT * FROM users WHERE username = ? AND password = ?",
            [credentials.username, credentials.password],
            (err, user) => {
                if (err || !user) {
                    // Optimized error reporting: If we had a specific rejection from the cloud, use it.
                    // Otherwise, provide the generic combined error.
                    const finalMessage = (cloudError && !cloudError.includes('ECONN') && !cloudError.includes('timeout'))
                        ? cloudError
                        : "Invalid credentials or user not found offline. Please check your internet or username/password.";

                    resolve({ success: false, message: finalMessage });
                    return;
                }

                // Set currentCompanyId first
                currentCompanyId = user.company_id;
                syncService.setCompanyId(user.company_id);

                console.log(`[OFFLINE LOGIN] User: ${user.username}, Role: ${user.role}, RoleID: ${user.role_id}, CompanyID: ${user.company_id}`);

                // Fetch permissions for the role using robust lookup (works with both local and global IDs)
                const permQuery = `
                    SELECT *, 
                           can_view as canView, 
                           can_create as canCreate, 
                           can_edit as canEdit, 
                           can_delete as canDelete 
                    FROM permissions 
                    WHERE role_id = ? 
                       OR role_id = (SELECT global_id FROM roles WHERE id = ?)
                `;
                db.all(permQuery, [user.role_id, user.role_id], (permErr, permissions) => {
                    if (permErr) {
                        console.error("[OFFLINE LOGIN] Error fetching permissions:", permErr);
                    }

                    console.log(`[OFFLINE LOGIN] Found ${permissions?.length || 0} permissions for role ${user.role_id}`);

                    // Format permissions to match cloud response format
                    const formattedPermissions = (permissions || []).map(p => ({
                        id: p.global_id || p.id,
                        roleId: p.role_id,
                        module: p.module,
                        can_view: p.can_view,
                        can_create: p.can_create,
                        can_edit: p.can_edit,
                        can_delete: p.can_delete,
                        canView: p.can_view === 1,
                        canCreate: p.can_create === 1,
                        canEdit: p.can_edit === 1,
                        canDelete: p.can_delete === 1
                    }));

                    resolve({
                        success: true,
                        user: {
                            id: user.global_id,
                            username: user.username,
                            role: user.role,
                            fullName: user.fullname,
                            company_id: user.company_id,
                            companyId: user.company_id,
                            role_id: user.role_id
                        },
                        permissions: formattedPermissions
                    });
                });
            }
        );
    });
});

// Companies
ipcMain.handle("get-companies", async () => {
    return new Promise((resolve, reject) => {
        db.all("SELECT *, is_active as isActive FROM companies ORDER BY name ASC", [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
});

ipcMain.handle("get-company", async (e, id) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM companies WHERE id = ? OR global_id = ?", [id, id], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
});

ipcMain.handle("get-company-requests", async (e, filters) => {
    // Local fallback/simulation if no cloud connection
    return [];
});

ipcMain.handle("create-company", async (e, data) => {
    return new Promise((resolve, reject) => {
        const { name, address, phone, email, tax_no } = data;
        const tempId = randomUUID();

        db.run(
            `INSERT INTO companies (global_id, name, address, phone, email, tax_no, sync_status, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)`,
            [tempId, name, address, phone, email, tax_no],
            function (err) {
                if (err) return reject(err);

                // Also create default system roles locally for this company if needed
                // (Usually pulled from cloud, but for offline-first, we might want local defaults)

                syncService.syncPendingRecords();
                resolve({ success: true, id: this.lastID, global_id: tempId, message: "Company created locally" });
            }
        );
    });
});

ipcMain.handle("update-company", async (e, data) => {
    return new Promise((resolve, reject) => {
        const { id, name, address, phone, email, tax_no, is_active } = data;
        const active = (is_active === 1 || is_active === true) ? 1 : 0;

        db.run(
            `UPDATE companies SET name=?, address=?, phone=?, email=?, tax_no=?, is_active=?, sync_status='pending', updated_at=CURRENT_TIMESTAMP 
             WHERE (id=? OR global_id=?) AND (sync_status != 'deleted' OR sync_status IS NULL)
`,
            [name, address, phone, email, tax_no, active, id, id],
            function (err) {
                if (err) return reject(err);
                syncService.syncPendingRecords();
                resolve({ success: true, message: "Company updated locally" });
            }
        );
    });
});
ipcMain.handle("delete-company", async (e, id) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT global_id FROM companies WHERE id = ? OR global_id = ?", [id, id], (err, row) => {
            const gid = row?.global_id;
            db.run(`UPDATE companies SET sync_status = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE id=? OR global_id=?`, [id, id], (err) => {
                if (err) reject(err);
                else {
                    syncService.syncPendingRecords();
                    resolve({ success: true, message: "Company marked for deletion locally." });
                }
            });
        });
    });
});

// Users - LOCAL FIRST
ipcMain.handle("get-users", async (e, companyId) => {
    const ids = await resolveCompanyIds(companyId);
    return new Promise((resolve, reject) => {
        if (!companyId) {
            db.all("SELECT *, is_active as isActive, fullname as fullName, role_id as roleId, company_id as companyId FROM users WHERE sync_status != 'deleted' OR sync_status IS NULL", (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
            return;
        }
        db.all("SELECT *, is_active as isActive, fullname as fullName, role_id as roleId, company_id as companyId FROM users WHERE (company_id = ? OR company_id = ? OR company_id = ?) AND (sync_status != 'deleted' OR sync_status IS NULL)", [ids.localId, ids.globalId, String(ids.localId)], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
});

// Roles & Permissions - LOCAL FIRST
ipcMain.handle("get-roles", async (e, companyId) => {
    const ids = await resolveCompanyIds(companyId);
    return new Promise((resolve, reject) => {
        const query = `
            SELECT r.*, 
                   r.is_active as isActive, 
                   r.is_system as isSystem,
                   (SELECT COUNT(*) FROM permissions WHERE (role_id = r.global_id OR role_id = CAST(r.id AS TEXT)) AND can_view = 1) as moduleCount
            FROM roles r 
            WHERE ((r.company_id = ? OR r.company_id = ? OR r.company_id = ?) 
               OR r.is_system = 1)
               AND (r.sync_status != 'deleted' OR r.sync_status IS NULL)
        `;
        db.all(query, [ids.localId, ids.globalId, String(ids.localId)], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
});

ipcMain.handle("get-permissions", (e, roleId) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT *, 
                   can_view, 
                   can_create, 
                   can_edit, 
                   can_delete,
                   can_view as canView, 
                   can_create as canCreate, 
                   can_edit as canEdit, 
                   can_delete as canDelete 
            FROM permissions 
            WHERE role_id = ? 
               OR role_id = (SELECT global_id FROM roles WHERE id = ?)
        `;
        db.all(query, [roleId, roleId], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
});

// Users Management Handlers (Missing previously)
ipcMain.handle("create-user", async (e, data) => {
    return new Promise((resolve, reject) => {
        const { username, password, role, fullname, company_id, companyId, role_id, roleId } = data;
        const cid = company_id || companyId || currentCompanyId;
        const rid = role_id || roleId;
        const tempId = randomUUID();

        db.run(
            `INSERT INTO users (global_id, username, password, role, role_id, fullname, company_id, sync_status, is_active, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 1, CURRENT_TIMESTAMP)`,
            [tempId, username, password, role, rid, fullname, cid],
            function (err) {
                if (err) return reject(err);
                syncService.syncPendingRecords();
                resolve({ success: true, id: this.lastID, global_id: tempId, message: "User created locally" });
            }
        );
    });
});

ipcMain.handle("update-user", async (e, data) => {
    return new Promise((resolve, reject) => {
        const { id, username, password, role, fullname, role_id, roleId, is_active } = data;
        const rid = role_id || roleId;
        const active = (is_active === 1 || is_active === true) ? 1 : 0;

        let query = "UPDATE users SET username=?, role=?, role_id=?, fullname=?, is_active=?, sync_status='pending', updated_at=CURRENT_TIMESTAMP";
        let params = [username, role, rid, fullname, active];

        if (password && password.trim() !== '') {
            query += ", password=?";
            params.push(password);
        }

        query += " WHERE id=? OR global_id=?";
        params.push(id, id);

        db.run(query, params, function (err) {
            if (err) return reject(err);
            syncService.syncPendingRecords();
            resolve({ success: true, message: "User updated locally" });
        });
    });
});

ipcMain.handle("delete-user", async (e, id) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT global_id FROM users WHERE id=? OR global_id=?", [id, id], (err, row) => {
            if (err || !row) return reject("User not found");
            const gid = row.global_id;

            db.run("UPDATE users SET sync_status = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE id=? OR global_id=?", [id, id], (delErr) => {
                if (delErr) reject(delErr);
                else {
                    syncService.syncPendingRecords();
                    resolve({ success: true, message: "User deleted locally" });
                }
            });
        });
    });
});

// Roles Management Handlers

// Helper: Resolve both local and global IDs for a company
async function resolveCompanyIds(cid) {
    return new Promise((resolve) => {
        if (!cid || cid === 'null' || cid === 'undefined') {
            return resolve({ localId: null, globalId: null, anyId: null });
        }

        db.get(
            "SELECT id, global_id FROM companies WHERE id = ? OR global_id = ?",
            [cid, cid],
            (err, row) => {
                if (row) {
                    resolve({
                        localId: row.id,
                        globalId: row.global_id,
                        anyId: row.global_id || row.id
                    });
                } else {
                    // Fallback
                    if (!isNaN(cid) && String(cid).length < 10) {
                        resolve({ localId: parseInt(cid), globalId: null, anyId: cid });
                    } else {
                        resolve({ localId: null, globalId: cid, anyId: cid });
                    }
                }
            }
        );
    });
}

ipcMain.handle("create-role", async (e, data) => {
    return new Promise((resolve, reject) => {
        const { name, description, permissions, companyId, company_id } = data;
        const cid = companyId || company_id;
        const tempId = randomUUID(); // Generate temp ID for local linking

        db.serialize(() => {
            db.run("BEGIN TRANSACTION");

            // 1. Insert Role
            db.run(
                `INSERT INTO roles (global_id, name, description, company_id, sync_status, is_system, updated_at) 
                 VALUES (?, ?, ?, ?, 'pending', 0, CURRENT_TIMESTAMP)`,
                [tempId, name, description, cid],
                function (err) {
                    if (err) {
                        db.run("ROLLBACK");
                        return reject(err);
                    }

                    // 2. Insert Permissions
                    if (permissions && permissions.length > 0) {
                        const stmt = db.prepare(`INSERT INTO permissions (role_id, module, can_view, can_create, can_edit, can_delete, sync_status, updated_at) 
                                                 VALUES (?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)`);
                        permissions.forEach(p => {
                            // Map incoming UI permissions (camelCase or snake_case)
                            const v = p.canView !== undefined ? p.canView : p.can_view;
                            const c = p.canCreate !== undefined ? p.canCreate : p.can_create;
                            const e = p.canEdit !== undefined ? p.canEdit : p.can_edit;
                            const d = p.canDelete !== undefined ? p.canDelete : p.can_delete;
                            stmt.run(tempId, p.module, v ? 1 : 0, c ? 1 : 0, e ? 1 : 0, d ? 1 : 0);
                        });
                        stmt.finalize();
                    }

                    db.run("COMMIT", function () {
                        // Trigger sync
                        syncService.syncPendingRecords();
                        resolve({ success: true, id: this.lastID, global_id: tempId, message: "Role created locally" });
                    });
                }
            );
        });
    });
});

ipcMain.handle("update-role", async (e, data) => {
    return new Promise((resolve, reject) => {
        const { id, global_id, name, description, permissions } = data;

        db.serialize(() => {
            db.run("BEGIN TRANSACTION");

            // 1. Update Role
            db.run(
                "UPDATE roles SET name = ?, description = ?, sync_status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                [name, description, id],
                (err) => {
                    if (err) {
                        db.run("ROLLBACK");
                        return reject(err);
                    }

                    // 2. Update Permissions (Delete all and re-insert is easiest for local update)
                    // Use global_id if available (for mapped permissions), otherwise we might have issues?
                    // Permissions table uses role_id. This role_id should be the global_id from role table.

                    // Find the role's global_id if not passed?
                    // Assuming frontend passes the correct identifier used in permissions table.
                    const roleIdentifier = global_id; // Using global_id as the link

                    db.run("DELETE FROM permissions WHERE role_id = ?", [roleIdentifier], (delErr) => {
                        if (delErr) {
                            db.run("ROLLBACK");
                            return reject(delErr);
                        }

                        if (permissions && permissions.length > 0) {
                            const stmt = db.prepare(`INSERT INTO permissions (role_id, module, can_view, can_create, can_edit, can_delete, sync_status) 
                                                     VALUES (?, ?, ?, ?, ?, ?, 'pending')`);
                            permissions.forEach(p => {
                                const v = p.canView !== undefined ? p.canView : p.can_view;
                                const c = p.canCreate !== undefined ? p.canCreate : p.can_create;
                                const e = p.canEdit !== undefined ? p.canEdit : p.can_edit;
                                const d = p.canDelete !== undefined ? p.canDelete : p.can_delete;
                                stmt.run(roleIdentifier, p.module, v ? 1 : 0, c ? 1 : 0, e ? 1 : 0, d ? 1 : 0);
                            });
                            stmt.finalize();
                        }

                        db.run("COMMIT", () => {
                            syncService.syncPendingRecords();
                            resolve({ success: true });
                        });
                    });
                }
            );
        });
    });
});

ipcMain.handle("delete-role", async (e, id) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT global_id FROM roles WHERE id = ? OR global_id = ?", [id, id], (err, row) => {
            if (err || !row) return reject("Role not found");
            const gid = row.global_id;

            db.serialize(() => {
                db.run("BEGIN TRANSACTION");
                db.run("UPDATE roles SET sync_status = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE global_id = ?", [gid]);

                db.run("COMMIT", (commitErr) => {
                    if (commitErr) {
                        db.run("ROLLBACK");
                        return reject(commitErr);
                    }
                    syncService.syncPendingRecords();
                    resolve({ success: true, message: "Role deleted locally." });
                });
            });
        });
    });
});

// Periodic Sync (Every 1 minute for near real-time updates)
setInterval(() => {
    if (!currentCompanyId) return;

    console.log(`[SYNC] Automated 1-minute sync check for company ${currentCompanyId}...`);
    syncService.syncPendingRecords(); // Push local changes (Users, Sales, etc.)
    // Pulling every 2 minutes or 5 minutes might be better for performance, 
    // but user asked for 1 minute sync, so we keep them together for now.
    syncService.pullAllData(currentCompanyId);
}, 1 * 60 * 1000);

// Products - LOCAL FIRST (Full Join for Details)
ipcMain.handle("get-products", async (e, companyId) => {
    const ids = await resolveCompanyIds(companyId);
    return new Promise((resolve, reject) => {
        const query = `
            SELECT p.*,
                   p.is_active as isActive,
                   c.name as category_name,
                   b.name as brand_name,
                   v.name as vendor_name,
                   p.cost_price as costPrice,
                   p.sell_price as sellPrice,
                   p.stock_quantity as stockQty,
                   p.code as sku,
                   p.alert_threshold as alertQty,
                   p.expiry_date as expiryDate
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id OR p.category_id = c.global_id
            LEFT JOIN brands b ON p.brand_id = b.id OR p.brand_id = b.global_id
            LEFT JOIN vendors v ON p.vendor_id = v.id OR p.vendor_id = v.global_id
            WHERE (p.company_id = ? OR p.company_id = ? OR p.company_id = ?) 
              AND p.sync_status != 'deleted'
            ORDER BY p.id DESC
        `;
        db.all(query, [ids.localId, ids.globalId, String(ids.localId)], (err, rows) => {
            if (err) {
                console.error("Local Products Query Error:", err);
                reject(err);
            } else {
                // Transform to nested objects for frontend compatibility
                const transformed = rows.map(row => ({
                    ...row,
                    costPrice: row.costPrice || 0,
                    sellPrice: row.sellPrice || 0,
                    category: row.category_id ? { id: row.category_id, name: row.category_name } : null,
                    brand: row.brand_id ? { id: row.brand_id, name: row.brand_name } : null,
                    vendor: row.vendor_id ? { id: row.vendor_id, name: row.vendor_name } : null
                }));
                resolve(transformed);
            }
        });
    });
});

ipcMain.handle("create-product", async (e, data) => {
    return new Promise((resolve, reject) => {
        const { name, cost_price, sell_price, stock_qty, stock_quantity, alert_qty, alert_threshold, category_id, vendor_id, brand_id, unit, weight, expiry_date, description, companyId, company_id, color, size, grade, condition } = data;
        const code = data.sku || data.code; // Robust mapping for SKU
        const finalCompanyId = companyId || company_id;
        db.run(
            `INSERT INTO products (global_id, name, code, cost_price, sell_price, stock_quantity, alert_threshold, category_id, vendor_id, brand_id, unit, weight, expiry_date, description, company_id, color, size, grade, condition, sync_status, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)`,
            [
                randomUUID(),
                name, code, cost_price || 0, sell_price || 0,
                stock_qty || stock_quantity || 0,
                alert_qty || alert_threshold || 5,
                category_id, vendor_id, brand_id, unit || 'pcs',
                weight || 0, expiry_date, description, finalCompanyId,
                color, size, grade, condition
            ],
            function (err) {
                if (err) return reject({ success: false, message: err.message });
                syncService.syncPendingRecords();
                resolve({ success: true, id: this.lastID, message: "Product saved locally and syncing..." });
            }
        );
    });
});

ipcMain.handle("update-product", async (e, data) => {
    return new Promise((resolve, reject) => {
        const { id, name, cost_price, sell_price, stock_qty, alert_qty, category_id, vendor_id, brand_id, unit, weight, expiry_date, description, companyId, company_id, color, size, grade, condition } = data;
        const code = data.sku || data.code; // Robust mapping for SKU
        db.run(
            `UPDATE products SET name=?, code=?, cost_price=?, sell_price=?, stock_quantity=?, alert_threshold=?, category_id=?, vendor_id=?, brand_id=?, unit=?, weight=?, expiry_date=?, description=?, company_id=?, color=?, size=?, grade=?, condition=?, sync_status='pending', updated_at=CURRENT_TIMESTAMP WHERE id=? OR global_id=?`,
            [name, code, cost_price, sell_price, stock_qty, alert_qty, category_id, vendor_id, brand_id, unit, weight, expiry_date, description, companyId || company_id, color, size, grade, condition, id, id],
            function (err) {
                if (err) return reject({ success: false, message: err.message });
                syncService.syncPendingRecords();
                resolve({ success: true, message: "Product updated locally and syncing..." });
            }
        );
    });
});

ipcMain.handle("delete-product", async (e, id) => {
    return new Promise((resolve, reject) => {
        // 1. Check if product exists and get its global_id
        db.get("SELECT global_id FROM products WHERE id=? OR global_id=?", [id, id], (err, row) => {
            if (err || !row) return resolve({ success: false, message: "Product not found" });
            const gid = row.global_id;

            // 2. Check for Transaction History (Standard Protection)
            // We check both sale_items and purchase_items
            const checkQuery = `
                SELECT 
                    (SELECT COUNT(*) FROM sale_items WHERE product_id = ? OR product_id = ?) +
                    (SELECT COUNT(*) FROM purchase_items WHERE product_id = ? OR product_id = ?) as linkedCount
            `;

            db.get(checkQuery, [id, gid, id, gid], (countErr, countRow) => {
                if (countErr) return reject(countErr);

                if (countRow && countRow.linkedCount > 0) {
                    return resolve({
                        success: false,
                        message: "Ye product delete nahi hosakta kyunki iska Sales ya Purchase record maujood hai. Aap isay Deactivate kar saktay hain."
                    });
                }

                // 3. No history? Mark for deletion
                db.run(`UPDATE products SET sync_status = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE id=? OR global_id=?`, [id, id], function (err) {
                    if (err) return reject({ success: false, message: err.message });
                    syncService.syncPendingRecords();
                    resolve({ success: true, message: "Product deleted locally." });
                });
            });
        });
    });
});

// Sales - LOCAL FIRST
ipcMain.handle("get-sales", async (e, companyId) => {
    const ids = await resolveCompanyIds(companyId);
    return new Promise((resolve, reject) => {
        const query = `
            SELECT s.*,
                   s.is_active as isActive,
                   c.name as customerName,
                   u.fullname as userName,
                   s.inv_number as invoiceNo,
                   s.grand_total as grandTotal,
                   s.amount_paid as amountPaid,
                   s.payment_status as paymentStatus,
                   s.sale_date as date,
                   (SELECT COUNT(*) FROM sale_items WHERE sale_id = s.global_id OR sale_id = CAST(s.id AS TEXT)) as itemCount
            FROM sales s
            LEFT JOIN customers c ON s.customer_id = c.id OR s.customer_id = c.global_id
            LEFT JOIN users u ON s.user_id = u.id OR s.user_id = u.global_id
            WHERE (s.company_id = ? OR s.company_id = ? OR s.company_id = ?) 
              AND s.sync_status != 'deleted'
            ORDER BY s.sale_date DESC
        `;
        db.all(query, [ids.localId, ids.globalId, String(ids.localId)], (err, rows) => {
            if (err) return reject(err);

            // Transform rows to include nested objects if frontend expects them
            const transformed = rows.map(row => ({
                ...row,
                customer: row.customerName ? { name: row.customerName } : null,
                user: row.userName ? { fullname: row.userName } : null,
                items: new Array(row.itemCount || 0).fill({}) // Mock items array for length check if needed
            }));
            resolve(transformed);
        });
    });
});

ipcMain.handle("add-sale", async (e, data) => {
    return new Promise((resolve, reject) => {
        const customer_id = data.customer_id || data.customerId;
        const user_id = data.user_id || data.userId;
        const total_amount = data.total_amount || data.totalAmount || data.subTotal || 0;
        const discount = data.discount || 0;
        const grand_total = data.grand_total || data.grandTotal || 0;
        const amount_paid = data.amount_paid || data.amountPaid || 0;
        const payment_method = data.payment_method || data.paymentMethod || 'CASH';
        const invoice_no = data.invoice_no || data.inv_number || data.invoiceNo || `INV-${Date.now()}`;
        const notes = data.notes || "";
        const tax_amount = data.tax_amount || data.tax || 0;
        const shipping_cost = data.shipping_cost || data.shippingCost || 0;
        const items = data.items || [];
        const finalCompanyId = data.companyId || data.company_id;

        const payment_status = data.payment_status || data.paymentStatus || 'PAID';
        const tempId = randomUUID();

        db.serialize(() => {
            db.run("BEGIN TRANSACTION");

            db.run(
                `INSERT INTO sales (global_id, customer_id, user_id, inv_number, total_amount, discount, grand_total, amount_paid, payment_method, payment_status, notes, tax_amount, shipping_cost, company_id, sync_status, updated_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)`,
                [tempId, customer_id, user_id, invoice_no, total_amount, discount, grand_total, amount_paid, payment_method, payment_status, notes, tax_amount, shipping_cost, finalCompanyId],
                function (err) {
                    if (err) {
                        db.run("ROLLBACK");
                        return reject({ success: false, message: err.message });
                    }

                    const saleId = this.lastID;

                    // 1. Add items and Update Stock
                    if (items && Array.isArray(items)) {
                        const stmt = db.prepare(`INSERT INTO sale_items (global_id, sale_id, product_id, quantity, unit_price, total_price) 
                                               VALUES (?, ?, ?, ?, ?, ?)`);
                        const stockStmt = db.prepare(`UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ? OR global_id = ?`);

                        items.forEach(item => {
                            const pid = item.productId || item.product_id;
                            const qty = item.quantity || 0;

                            stmt.run(randomUUID(), tempId, pid, qty, item.price || item.unit_price, item.total || item.total_price || (qty * (item.price || item.unit_price)));
                            stockStmt.run(qty, pid, pid);
                        });
                        stmt.finalize();
                        stockStmt.finalize();
                    }

                    // 2. Update Customer Balance
                    if (customer_id) {
                        const balanceChange = grand_total - amount_paid;
                        db.run(`UPDATE customers SET current_balance = current_balance + ? WHERE id = ? OR global_id = ?`, [balanceChange, customer_id, customer_id]);
                    }

                    db.run("COMMIT", (commitErr) => {
                        if (commitErr) {
                            db.run("ROLLBACK");
                            return reject({ success: false, message: commitErr.message });
                        }
                        syncService.syncPendingRecords();
                        resolve({ success: true, id: saleId, global_id: tempId, message: "Sale recorded and stock/balance updated." });
                    });
                }
            );
        });
    });
});

ipcMain.handle("update-sale", async (e, data) => {
    return new Promise((resolve, reject) => {
        const { id, global_id, items } = data;
        const customer_id = data.customer_id || data.customerId;
        const inv_number = data.inv_number || data.invoiceNo || data.invoice_no;
        const total_amount = data.total_amount || data.totalAmount || data.subTotal || 0;
        const grand_total = data.grand_total || data.grandTotal || 0;
        const amount_paid = data.amount_paid || data.amountPaid || 0;
        const discount = data.discount || 0;
        const tax_amount = data.tax_amount || data.tax || 0;
        const shipping_cost = data.shipping_cost || data.shippingCost || 0;
        const payment_method = data.payment_method || data.paymentMethod || 'CASH';
        const notes = data.notes || "";
        const payment_status = data.payment_status || data.paymentStatus || 'PAID';

        db.serialize(() => {
            // First, fetch the old sale to reverse stock and balance
            db.get("SELECT * FROM sales WHERE id=? OR global_id=?", [id, id], (err, oldSale) => {
                if (!oldSale) return reject("Old sale not found");

                const oldGid = oldSale.global_id;

                db.all("SELECT * FROM sale_items WHERE sale_id=?", [oldGid], (err, oldItems) => {
                    db.run("BEGIN TRANSACTION");

                    // 1. Reverse Old Stock
                    const reverseStockStmt = db.prepare("UPDATE products SET stock_quantity = stock_quantity + ? WHERE id=? OR global_id=?");
                    oldItems.forEach(item => reverseStockStmt.run(item.quantity, item.product_id, item.product_id));
                    reverseStockStmt.finalize();

                    // 2. Reverse Old Customer Balance
                    if (oldSale.customer_id) {
                        const oldDiff = oldSale.grand_total - oldSale.amount_paid;
                        db.run("UPDATE customers SET current_balance = current_balance - ? WHERE id=? OR global_id=?", [oldDiff, oldSale.customer_id, oldSale.customer_id]);
                    }

                    // 3. Update Sale Record
                    db.run(
                        `UPDATE sales SET customer_id=?, inv_number=?, total_amount=?, discount=?, grand_total=?, amount_paid=?, payment_method=?, payment_status=?, notes=?, tax_amount=?, shipping_cost=?, sync_status='pending', updated_at=CURRENT_TIMESTAMP WHERE id=? OR global_id=?`,
                        [customer_id, inv_number, total_amount, discount, grand_total, amount_paid, payment_method, payment_status, notes, tax_amount, shipping_cost, id, id],
                        function (err) {
                            if (err) { db.run("ROLLBACK"); return reject(err); }

                            // 4. Delete and Re-insert items, Update New Stock
                            db.run("DELETE FROM sale_items WHERE sale_id = ?", [oldGid], (delErr) => {
                                if (items && Array.isArray(items)) {
                                    const stmt = db.prepare(`INSERT INTO sale_items (global_id, sale_id, product_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?, ?)`);
                                    const stockStmt = db.prepare(`UPDATE products SET stock_quantity = stock_quantity - ? WHERE id=? OR global_id=?`);

                                    items.forEach(item => {
                                        const pid = item.productId || item.product_id;
                                        const qty = item.quantity || 0;
                                        stmt.run(randomUUID(), oldGid, pid, qty, item.price || item.unit_price, item.total || item.total_price);
                                        stockStmt.run(qty, pid, pid);
                                    });
                                    stmt.finalize();
                                    stockStmt.finalize();
                                }

                                // 5. Apply New Customer Balance
                                if (customer_id) {
                                    const newDiff = grand_total - amount_paid;
                                    db.run("UPDATE customers SET current_balance = current_balance + ? WHERE id=? OR global_id=?", [newDiff, customer_id, customer_id]);
                                }

                                db.run("COMMIT", (commitErr) => {
                                    if (commitErr) { db.run("ROLLBACK"); return reject(commitErr); }
                                    syncService.syncPendingRecords();
                                    resolve({ success: true, message: "Sale updated and stock/balance adjusted." });
                                });
                            });
                        }
                    );
                });
            });
        });
    });
});

ipcMain.handle("delete-sale", async (e, id) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM sales WHERE id = ? OR global_id = ?", [id, id], (err, sale) => {
            if (err || !sale) return reject("Sale not found");
            const gid = sale.global_id;

            db.all("SELECT * FROM sale_items WHERE sale_id = ?", [gid], (itemErr, items) => {
                db.serialize(() => {
                    db.run("BEGIN TRANSACTION");

                    // 1. Restore Stock
                    const stockStmt = db.prepare("UPDATE products SET stock_quantity = stock_quantity + ? WHERE id=? OR global_id=?");
                    items.forEach(item => stockStmt.run(item.quantity, item.product_id, item.product_id));
                    stockStmt.finalize();

                    // 2. Adjust Customer Balance
                    if (sale.customer_id) {
                        const diff = sale.grand_total - sale.amount_paid;
                        db.run("UPDATE customers SET current_balance = current_balance - ? WHERE id=? OR global_id=?", [diff, sale.customer_id, sale.customer_id]);
                    }

                    // 3. Mark Sale as Deleted (Soft delete for sync)
                    db.run("UPDATE sales SET sync_status = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE global_id = ?", [gid], (delErr) => {
                        if (delErr) { db.run("ROLLBACK"); return reject(delErr); }

                        db.run("COMMIT", (commitErr) => {
                            if (commitErr) { db.run("ROLLBACK"); return reject(commitErr); }
                            syncService.syncPendingRecords();
                            resolve({ success: true, message: "Sale deleted and stock/balance restored." });
                        });
                    });
                });
            });
        });
    });
});

// Customers - LOCAL FIRST
ipcMain.handle("get-customers", async (e, companyId) => {
    const ids = await resolveCompanyIds(companyId);
    return new Promise((resolve, reject) => {
        db.all(`SELECT *, 
                       is_active as isActive, 
                       current_balance as balance,
                       credit_limit as creditLimit,
                       opening_balance as openingBalance,
                       gst_no as gstNo,
                       customer_type as customerType
                FROM customers 
                WHERE (company_id = ? OR company_id = ? OR company_id = ?) 
                  AND (sync_status != 'deleted' OR sync_status IS NULL) 
                ORDER BY name ASC`, [ids.localId, ids.globalId, String(ids.localId)], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
});

ipcMain.handle("create-customer", async (e, data) => {
    return new Promise((resolve, reject) => {
        const { name, phone, email, address, city, cnic, gst_no, creditLimit, openingBalance, customer_type, customerType, companyId, company_id } = data;
        const finalCompanyId = companyId || company_id;
        const cType = customer_type || customerType || 'retail';
        const opBal = parseFloat(openingBalance || 0);
        const credLim = parseFloat(creditLimit || 0);

        const tempId = randomUUID();

        db.run(
            `INSERT INTO customers (
                global_id, name, phone, email, address, city, cnic, gst_no, 
                customer_type, credit_limit, opening_balance, current_balance, 
                company_id, sync_status, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)`,
            [
                tempId, name, phone, email, address, city, cnic, gst_no,
                cType, credLim, opBal, opBal, // current_balance starts as opening_balance
                finalCompanyId
            ],
            function (err) {
                if (err) return reject({ success: false, message: err.message });
                syncService.syncPendingRecords();
                resolve({ success: true, id: this.lastID, global_id: tempId, message: "Customer saved locally." });
            }
        );
    });
});

ipcMain.handle("update-customer", async (e, data) => {
    return new Promise((resolve, reject) => {
        const { id, name, phone, email, address, city, cnic, gst_no, creditLimit, openingBalance, balance, customer_type, customerType, companyId, company_id } = data;
        const cType = customer_type || customerType || 'retail';
        // const opBal = openingBalance !== undefined ? parseFloat(openingBalance) : undefined; // Opening balance usually doesn't change, but if edited, use it.
        // Wait, opening balance SHOULD NOT change after transactions exist. But for now allow it if user edits it.
        // Also allow updating current balance explicitly if provided (e.g. via 'balance' field from frontend).

        // We need to be careful with current_balance. 
        // If frontend sends 'balance', update current_balance.

        const updates = [];
        const params = [];

        if (name !== undefined) { updates.push("name=?"); params.push(name); }
        if (phone !== undefined) { updates.push("phone=?"); params.push(phone); }
        if (email !== undefined) { updates.push("email=?"); params.push(email); }
        if (address !== undefined) { updates.push("address=?"); params.push(address); }
        if (city !== undefined) { updates.push("city=?"); params.push(city); }
        if (cnic !== undefined) { updates.push("cnic=?"); params.push(cnic); }
        if (gst_no !== undefined) { updates.push("gst_no=?"); params.push(gst_no); }
        if (cType !== undefined) { updates.push("customer_type=?"); params.push(cType); }

        if (creditLimit !== undefined) {
            updates.push("credit_limit=?");
            params.push(parseFloat(creditLimit) || 0);
        }

        if (openingBalance !== undefined) {
            updates.push("opening_balance=?");
            params.push(parseFloat(openingBalance) || 0);
        }

        if (balance !== undefined) {
            updates.push("current_balance=?");
            params.push(parseFloat(balance) || 0);
        }

        updates.push("sync_status='pending'");
        updates.push("updated_at=CURRENT_TIMESTAMP");

        // Always update company_id if provided? Maybe not needed if it's already there, but safe.
        if (companyId || company_id) {
            updates.push("company_id=?");
            params.push(companyId || company_id);
        }

        const query = `UPDATE customers SET ${updates.join(", ")} WHERE id=? OR global_id=?`;
        params.push(id, id);

        db.run(query, params, function (err) {
            if (err) return reject({ success: false, message: err.message });
            syncService.syncPendingRecords();
            resolve({ success: true, message: "Customer updated locally." });
        });
    });
});

ipcMain.handle("delete-customer", async (e, id) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT global_id FROM customers WHERE id=? OR global_id=?", [id, id], (err, row) => {
            if (err || !row) return resolve({ success: false, message: "Customer not found" });
            const gid = row.global_id;

            // Check if any sale is using this customer
            db.get("SELECT COUNT(*) as count FROM sales WHERE customer_id = ? OR customer_id = ?", [id, gid], (countErr, countRow) => {
                if (countErr) return reject(countErr);

                if (countRow && countRow.count > 0) {
                    return resolve({ success: false, message: "Is Customer ko delete nahi kiya ja sakta kyunke iske sales records maujood hain. Aap isay Deactivate kar saktay hain." });
                }

                db.run(`UPDATE customers SET sync_status = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE id=? OR global_id=?`, [id, id], (err) => {
                    if (err) reject(err);
                    else {
                        syncService.syncPendingRecords();
                        resolve({ success: true, message: "Customer marked for deletion locally." });
                    }
                });
            });
        });
    });
});

// Vendors (Suppliers) - LOCAL FIRST
ipcMain.handle("get-vendors", async (e, companyId) => {
    const ids = await resolveCompanyIds(companyId);
    return new Promise((resolve, reject) => {
        db.all(`SELECT *, 
                       is_active as isActive, 
                       current_balance as balance,
                       opening_balance as openingBalance,
                       company_name as companyName,
                       contact_person as contactPerson,
                       gst_no as gstNo
                FROM vendors 
                WHERE (company_id = ? OR company_id = ? OR company_id = ?) 
                  AND (sync_status != 'deleted' OR sync_status IS NULL) 
                ORDER BY name ASC`, [ids.localId, ids.globalId, String(ids.localId)], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
});

ipcMain.handle("create-vendor", async (e, data) => {
    return new Promise((resolve, reject) => {
        const { name, contact_person, contactPerson, phone, email, address, city, gst_no, gstNo, company_name, companyName, openingBalance, companyId, company_id } = data;
        const finalCompanyId = companyId || company_id;
        const opBal = parseFloat(openingBalance || 0);
        const cPerson = contact_person || contactPerson || "";
        const cName = company_name || companyName || "";
        const gNo = gst_no || gstNo || "";

        const tempId = randomUUID();
        db.run(
            `INSERT INTO vendors (
                global_id, name, contact_person, phone, email, address, city, gst_no, company_name, 
                opening_balance, current_balance, company_id, sync_status, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)`,
            [
                tempId, name, cPerson, phone, email, address, city, gNo, cName,
                opBal, opBal, // current_balance starts as opening_balance
                finalCompanyId
            ],
            function (err) {
                if (err) return reject({ success: false, message: err.message });
                syncService.syncPendingRecords();
                resolve({ success: true, id: this.lastID, global_id: tempId, message: "Vendor saved locally." });
            }
        );
    });
});

ipcMain.handle("update-vendor", async (e, data) => {
    return new Promise((resolve, reject) => {
        const { id, name, contact_person, contactPerson, phone, email, address, city, gst_no, gstNo, company_name, companyName, openingBalance, balance, currentBalance, companyId, company_id } = data;

        const updates = [];
        const params = [];

        if (name !== undefined) { updates.push("name=?"); params.push(name); }

        const cPerson = contact_person !== undefined ? contact_person : contactPerson;
        if (cPerson !== undefined) { updates.push("contact_person=?"); params.push(cPerson); }

        if (phone !== undefined) { updates.push("phone=?"); params.push(phone); }
        if (email !== undefined) { updates.push("email=?"); params.push(email); }
        if (address !== undefined) { updates.push("address=?"); params.push(address); }
        if (city !== undefined) { updates.push("city=?"); params.push(city); }

        const gNo = gst_no !== undefined ? gst_no : gstNo;
        if (gNo !== undefined) { updates.push("gst_no=?"); params.push(gNo); }

        const cName = company_name !== undefined ? company_name : companyName;
        if (cName !== undefined) { updates.push("company_name=?"); params.push(cName); }

        if (openingBalance !== undefined && openingBalance !== "") {
            updates.push("opening_balance=?");
            params.push(parseFloat(openingBalance));
        }

        const bal = balance !== undefined ? balance : currentBalance;
        if (bal !== undefined && bal !== "") {
            updates.push("current_balance=?");
            params.push(parseFloat(bal));
        }

        updates.push("sync_status='pending'");
        updates.push("updated_at=CURRENT_TIMESTAMP");

        if (companyId || company_id) {
            updates.push("company_id=?");
            params.push(companyId || company_id);
        }

        const query = `UPDATE vendors SET ${updates.join(", ")} WHERE id=? OR global_id=?`;
        params.push(id, id);

        db.run(query, params, function (err) {
            if (err) return reject({ success: false, message: err.message });
            syncService.syncPendingRecords();
            resolve({ success: true });
        });
    });
});

ipcMain.handle("delete-vendor", async (e, id) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT global_id FROM vendors WHERE id=? OR global_id=?", [id, id], (err, row) => {
            if (err || !row) return resolve({ success: false, message: "Vendor not found" });
            const gid = row.global_id;

            // Check if any purchase or product is using this vendor
            const checkQuery = `
                SELECT 
                    (SELECT COUNT(*) FROM purchases WHERE vendor_id = ? OR vendor_id = ?) +
                    (SELECT COUNT(*) FROM products WHERE vendor_id = ? OR vendor_id = ?) as linkedCount
            `;

            db.get(checkQuery, [id, gid, id, gid], (countErr, countRow) => {
                if (countErr) return reject(countErr);

                if (countRow && countRow.linkedCount > 0) {
                    return resolve({ success: false, message: "Is Vendor ko delete nahi kiya ja sakta kyunke iske purchases ya items records maujood hain. Aap isay Deactivate kar saktay hain." });
                }

                db.run(`UPDATE vendors SET sync_status = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE id=? OR global_id=?`, [id, id], (err) => {
                    if (err) reject(err);
                    else {
                        syncService.syncPendingRecords();
                        resolve({ success: true, message: "Vendor marked for deletion locally." });
                    }
                });
            });
        });
    });
});

// Expenses - LOCAL FIRST
ipcMain.handle("get-expenses", async (e, companyId) => {
    const ids = await resolveCompanyIds(companyId);
    return new Promise((resolve, reject) => {
        db.all("SELECT *, is_active as isActive FROM expenses WHERE (company_id = ? OR company_id = ? OR company_id = ?) AND (sync_status != 'deleted' OR sync_status IS NULL) ORDER BY date DESC", [ids.localId, ids.globalId, String(ids.localId)], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
});

ipcMain.handle("create-expense", async (e, data) => {
    return new Promise((resolve, reject) => {
        const { title, amount, date, description, category, companyId, company_id } = data;
        const finalCompanyId = companyId || company_id;
        db.run(
            `INSERT INTO expenses (global_id, title, amount, date, description, category, company_id, sync_status, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)`,
            [randomUUID(), title, amount || 0, date, description, category, finalCompanyId],
            function (err) {
                if (err) return reject({ success: false, message: err.message });
                syncService.syncPendingRecords();
                resolve({ success: true, id: this.lastID, message: "Expense saved locally." });
            }
        );
    });
});

ipcMain.handle("update-expense", async (e, data) => {
    return new Promise((resolve, reject) => {
        const { id, title, amount, date, description, category, companyId } = data;
        const query = `UPDATE expenses SET title=?, amount=?, date=?, description=?, category=?, company_id=?, sync_status='pending', updated_at=CURRENT_TIMESTAMP WHERE id=? OR global_id=?`;
        db.run(query, [title, amount, date, description, category, companyId, id, id], function (err) {
            if (err) return reject({ success: false, message: err.message });
            syncService.syncPendingRecords();
            resolve({ success: true, message: "Expense updated locally." });
        });
    });
});

ipcMain.handle("delete-expense", async (e, id) => {
    return new Promise((resolve, reject) => {
        db.run(`UPDATE expenses SET sync_status = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE id=? OR global_id=?`, [id, id], (err) => {
            if (err) reject(err);
            else {
                syncService.syncPendingRecords();
                resolve({ success: true, message: "Expense deleted locally." });
            }
        });
    });
});

// Inventory - Categories - LOCAL FIRST
ipcMain.handle("get-categories", async (e, companyId) => {
    const ids = await resolveCompanyIds(companyId);
    return new Promise((resolve, reject) => {
        db.all("SELECT *, is_active as isActive FROM categories WHERE (company_id = ? OR company_id = ? OR company_id = ?) AND (sync_status != 'deleted' OR sync_status IS NULL)", [ids.localId, ids.globalId, String(ids.localId)], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
});

ipcMain.handle("create-category", async (e, data) => {
    return new Promise((resolve, reject) => {
        const { name, companyId, company_id } = data;
        const cid = companyId || company_id;
        const tempId = randomUUID();
        db.run(
            `INSERT INTO categories (global_id, name, company_id, sync_status, updated_at) VALUES (?, ?, ?, 'pending', CURRENT_TIMESTAMP)`,
            [tempId, name, cid],
            function (err) {
                if (err) return reject({ success: false, message: err.message });
                syncService.syncPendingRecords();
                resolve({ success: true, id: this.lastID, global_id: tempId });
            }
        );
    });
});

// Inventory - Brands - LOCAL FIRST
ipcMain.handle("get-brands", async (e, companyId) => {
    const ids = await resolveCompanyIds(companyId);
    return new Promise((resolve, reject) => {
        db.all("SELECT *, is_active as isActive FROM brands WHERE (company_id = ? OR company_id = ? OR company_id = ?) AND (sync_status != 'deleted' OR sync_status IS NULL)", [ids.localId, ids.globalId, String(ids.localId)], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
});

ipcMain.handle("create-brand", async (e, data) => {
    return new Promise((resolve, reject) => {
        const { name, companyId, company_id } = data;
        const cid = companyId || company_id;
        const tempId = randomUUID();
        db.run(
            `INSERT INTO brands (global_id, name, company_id, sync_status, updated_at) VALUES (?, ?, ?, 'pending', CURRENT_TIMESTAMP)`,
            [tempId, name, cid],
            function (err) {
                if (err) return reject({ success: false, message: err.message });
                syncService.syncPendingRecords();
                resolve({ success: true, id: this.lastID, global_id: tempId });
            }
        );
    });
});

ipcMain.handle("delete-category", async (e, id) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT global_id FROM categories WHERE id=? OR global_id=?", [id, id], (err, row) => {
            if (err || !row) return resolve({ success: false, message: "Category not found" });
            const gid = row.global_id;

            // Check if any product is using this category
            db.get("SELECT COUNT(*) as count FROM products WHERE category_id = ? OR category_id = ?", [id, gid], (countErr, countRow) => {
                if (countRow && countRow.count > 0) {
                    return resolve({ success: false, message: "Is Category ko delete nahi kiya ja sakta kyunke is mein products maujood hain." });
                }

                db.run(`UPDATE categories SET sync_status = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE id=? OR global_id=?`, [id, id], (err) => {
                    if (err) reject(err);
                    else {
                        syncService.syncPendingRecords();
                        resolve({ success: true, message: "Category marked for deletion locally." });
                    }
                });
            });
        });
    });
});

ipcMain.handle("delete-brand", async (e, id) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT global_id FROM brands WHERE id=? OR global_id=?", [id, id], (err, row) => {
            if (err || !row) return resolve({ success: false, message: "Brand not found" });
            const gid = row.global_id;

            // Check if any product is using this brand
            db.get("SELECT COUNT(*) as count FROM products WHERE brand_id = ? OR brand_id = ?", [id, gid], (countErr, countRow) => {
                if (countRow && countRow.count > 0) {
                    return resolve({ success: false, message: "Is Brand ko delete nahi kiya ja sakta kyunke ye products mein use horahi hai." });
                }

                db.run(`UPDATE brands SET sync_status = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE id=? OR global_id=?`, [id, id], (err) => {
                    if (err) reject(err);
                    else {
                        syncService.syncPendingRecords();
                        resolve({ success: true, message: "Brand marked for deletion locally." });
                    }
                });
            });
        });
    });
});
ipcMain.handle("get-purchases", async (e, companyId) => {
    const ids = await resolveCompanyIds(companyId);
    return new Promise((resolve, reject) => {
        const query = `
            SELECT p.*, 
                   v.name as vendorName,
                   p.ref_number as invoiceNo,
                   p.total_amount as totalAmount,
                   p.paid_amount as paidAmount,
                   p.payment_status as paymentStatus,
                   p.purchase_date as date,
                   p.due_date as dueDate,
                   p.shipping_cost as shippingCost,
                   p.discount,
                   p.tax_amount as tax,
                   p.notes,
                   p.payment_method as paymentMethod,
                   (SELECT COUNT(*) FROM purchase_items WHERE purchase_id = p.global_id OR purchase_id = CAST(p.id AS TEXT)) as itemCount
            FROM purchases p
            LEFT JOIN vendors v ON p.vendor_id = v.id OR p.vendor_id = v.global_id
            WHERE (p.company_id = ? OR p.company_id = ? OR p.company_id = ?) 
              AND (p.sync_status != 'deleted' OR p.sync_status IS NULL)
            ORDER BY p.purchase_date DESC
        `;
        db.all(query, [ids.localId, ids.globalId, String(ids.localId)], (err, rows) => {
            if (err) return reject(err);

            // Fetch items for each purchase if needed, or leave for individual fetch
            // Modernizing to include vendor object for frontend
            const transformed = rows.map(row => ({
                ...row,
                vendor: row.vendorName ? { name: row.vendorName } : null,
                items: new Array(row.itemCount || 0).fill({})
            }));
            resolve(transformed);
        });
    });
});

ipcMain.handle("add-purchase", async (e, data) => {
    return new Promise((resolve, reject) => {
        const vendor_id = data.vendor_id || data.vendorId;
        const total_amount = data.total_amount || data.totalAmount || data.grandTotal || 0;
        const paid_amount = data.paid_amount || data.paidAmount || 0;
        const ref_number = data.ref_number || data.refNumber || data.invoiceNo || `PUR-${Date.now()}`;
        const shipping_cost = data.shipping_cost || data.shippingCost || 0;
        const discount = data.discount || 0;
        const tax_amount = data.tax_amount || data.tax || 0;
        const notes = data.notes || "";
        const payment_method = data.payment_method || data.paymentMethod || "CASH";
        const payment_status = data.payment_status || data.paymentStatus || "RECEIVED";
        const due_date = data.due_date || data.dueDate || null;
        const companyId = data.companyId || data.company_id;
        const items = data.items || [];

        const tempId = randomUUID();

        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            db.run(
                `INSERT INTO purchases (global_id, vendor_id, total_amount, paid_amount, shipping_cost, discount, tax_amount, notes, payment_method, payment_status, due_date, company_id, sync_status, updated_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)`,
                [tempId, vendor_id, total_amount, paid_amount, shipping_cost, discount, tax_amount, notes, payment_method, payment_status, due_date, companyId],
                function (err) {
                    if (err) {
                        db.run("ROLLBACK");
                        return reject({ success: false, message: err.message });
                    }

                    // 1. Add Items and Update Stock
                    if (items && Array.isArray(items)) {
                        const stmt = db.prepare(`INSERT INTO purchase_items (global_id, purchase_id, product_id, quantity, unit_cost, total_cost) VALUES (?, ?, ?, ?, ?, ?)`);
                        const stockStmt = db.prepare(`UPDATE products SET stock_quantity = stock_quantity + ? WHERE id=? OR global_id=?`);

                        items.forEach(item => {
                            const pid = item.productId || item.product_id;
                            const qty = item.quantity || 0;
                            stmt.run(randomUUID(), tempId, pid, qty, item.unit_cost || item.unitCost || item.price || 0, item.total_cost || item.totalCost || item.total || 0);
                            stockStmt.run(qty, pid, pid);
                        });
                        stmt.finalize();
                        stockStmt.finalize();
                    }

                    // 2. Update Vendor Balance
                    if (vendor_id) {
                        const balanceChange = total_amount - paid_amount;
                        db.run(`UPDATE vendors SET current_balance = current_balance + ? WHERE id=? OR global_id=?`, [balanceChange, vendor_id, vendor_id]);
                    }

                    db.run("COMMIT", (commitErr) => {
                        if (commitErr) { db.run("ROLLBACK"); return reject({ success: false, message: commitErr.message }); }
                        syncService.syncPendingRecords();
                        resolve({ success: true, global_id: tempId, message: "Purchase recorded and stock/balance updated." });
                    });
                }
            );
        });
    });
});

ipcMain.handle("update-purchase", async (e, data) => {
    return new Promise((resolve, reject) => {
        const { id, global_id, items } = data;
        const vendor_id = data.vendor_id || data.vendorId;
        const total_amount = data.total_amount || data.totalAmount || data.grandTotal || 0;
        const paid_amount = data.paid_amount || data.paidAmount || 0;
        const ref_number = data.ref_number || data.refNumber || data.invoiceNo;
        const shipping_cost = data.shipping_cost || data.shippingCost || 0;
        const discount = data.discount || 0;
        const tax_amount = data.tax_amount || data.tax || 0;
        const notes = data.notes || "";
        const payment_method = data.payment_method || data.paymentMethod || "CASH";
        const payment_status = data.payment_status || data.paymentStatus || "RECEIVED";
        const due_date = data.due_date || data.dueDate || null;
        const companyId = data.companyId || data.company_id;

        db.serialize(() => {
            // Fetch old purchase to reverse
            db.get("SELECT * FROM purchases WHERE id=? OR global_id=?", [id, id], (err, oldPurchase) => {
                if (!oldPurchase) return reject("Old purchase not found");
                const oldGid = oldPurchase.global_id;

                db.all("SELECT * FROM purchase_items WHERE purchase_id=?", [oldGid], (itemErr, oldItems) => {
                    db.run("BEGIN TRANSACTION");

                    // 1. Reverse Old Stock
                    const reverseStockStmt = db.prepare("UPDATE products SET stock_quantity = stock_quantity - ? WHERE id=? OR global_id=?");
                    oldItems.forEach(item => reverseStockStmt.run(item.quantity, item.product_id, item.product_id));
                    reverseStockStmt.finalize();

                    // 2. Reverse Old Vendor Balance
                    if (oldPurchase.vendor_id) {
                        const oldDiff = oldPurchase.total_amount - oldPurchase.paid_amount;
                        db.run("UPDATE vendors SET current_balance = current_balance - ? WHERE id=? OR global_id=?", [oldDiff, oldPurchase.vendor_id, oldPurchase.vendor_id]);
                    }

                    // 3. Update Purchase Record
                    db.run(
                        `UPDATE purchases SET vendor_id=?, ref_number=?, total_amount=?, paid_amount=?, shipping_cost=?, discount=?, tax_amount=?, notes=?, payment_method=?, payment_status=?, due_date=?, company_id=?, sync_status='pending', updated_at=CURRENT_TIMESTAMP WHERE id=? OR global_id=?`,
                        [vendor_id, ref_number, total_amount, paid_amount, shipping_cost, discount, tax_amount, notes, payment_method, payment_status, due_date, companyId, id, id],
                        function (err) {
                            if (err) { db.run("ROLLBACK"); return reject(err); }

                            // 4. Delete and Re-insert items, Update New Stock
                            db.run("DELETE FROM purchase_items WHERE purchase_id = ?", [oldGid], (delErr) => {
                                if (items && Array.isArray(items)) {
                                    const stmt = db.prepare(`INSERT INTO purchase_items (global_id, purchase_id, product_id, quantity, unit_cost, total_cost) VALUES (?, ?, ?, ?, ?, ?)`);
                                    const stockStmt = db.prepare(`UPDATE products SET stock_quantity = stock_quantity + ? WHERE id=? OR global_id=?`);

                                    items.forEach(item => {
                                        const pid = item.productId || item.product_id;
                                        const qty = item.quantity || 0;
                                        stmt.run(randomUUID(), oldGid, pid, qty, item.unit_cost || item.unitCost || item.price || 0, item.total_cost || item.totalCost || item.total || 0);
                                        stockStmt.run(qty, pid, pid);
                                    });
                                    stmt.finalize();
                                    stockStmt.finalize();
                                }

                                // 5. Apply New Vendor Balance
                                if (vendor_id) {
                                    const newDiff = total_amount - paid_amount;
                                    db.run("UPDATE vendors SET current_balance = current_balance + ? WHERE id=? OR global_id=?", [newDiff, vendor_id, vendor_id]);
                                }

                                db.run("COMMIT", (commitErr) => {
                                    if (commitErr) { db.run("ROLLBACK"); return reject(commitErr); }
                                    syncService.syncPendingRecords();
                                    resolve({ success: true, message: "Purchase updated and stock/balance adjusted." });
                                });
                            });
                        }
                    );
                });
            });
        });
    });
});

ipcMain.handle("delete-purchase", async (e, id) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM purchases WHERE id = ? OR global_id = ?", [id, id], (err, purchase) => {
            if (err || !purchase) return reject("Purchase not found");
            const gid = purchase.global_id;

            db.all("SELECT * FROM purchase_items WHERE purchase_id = ?", [gid], (itemErr, items) => {
                db.serialize(() => {
                    db.run("BEGIN TRANSACTION");

                    // 1. Reverse Stock
                    const stockStmt = db.prepare("UPDATE products SET stock_quantity = stock_quantity - ? WHERE id=? OR global_id=?");
                    items.forEach(item => stockStmt.run(item.quantity, item.product_id, item.product_id));
                    stockStmt.finalize();

                    // 2. Adjust Vendor Balance
                    if (purchase.vendor_id) {
                        const diff = purchase.total_amount - purchase.paid_amount;
                        db.run("UPDATE vendors SET current_balance = current_balance - ? WHERE id=? OR global_id=?", [diff, purchase.vendor_id, purchase.vendor_id]);
                    }

                    // 3. Mark Purchase as Deleted
                    db.run("UPDATE purchases SET sync_status = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE global_id = ?", [gid], (delErr) => {
                        if (delErr) { db.run("ROLLBACK"); return reject(delErr); }

                        db.run("COMMIT", (commitErr) => {
                            if (commitErr) { db.run("ROLLBACK"); return reject(commitErr); }
                            syncService.syncPendingRecords();
                            resolve({ success: true, message: "Purchase deleted and stock/balance restored." });
                        });
                    });
                });
            });
        });
    });
});

// ==========================================
// RETURNS - Sale Returns - LOCAL FIRST
// ==========================================
ipcMain.handle("get-sale-returns", async (e, companyId) => {
    const ids = await resolveCompanyIds(companyId);
    return new Promise((resolve, reject) => {
        const query = `
            SELECT sr.*, c.name as customer_name,
                   (SELECT json_group_array(json_object(
                       'productId', sri.product_id,
                       'quantity', sri.quantity,
                       'price', sri.price,
                       'total', sri.total,
                       'name', p.name
                   )) FROM sale_return_items sri 
                   LEFT JOIN products p ON sri.product_id = p.id OR sri.product_id = p.global_id
                   WHERE sri.return_id = sr.global_id OR sri.return_id = sr.id) as items
            FROM sale_returns sr
            LEFT JOIN customers c ON sr.customer_id = c.id OR sr.customer_id = c.global_id
            WHERE (sr.company_id = ? OR sr.company_id = ? OR sr.company_id = ?) 
              AND (sr.sync_status != 'deleted' OR sr.sync_status IS NULL)
            ORDER BY sr.date DESC
        `;
        db.all(query, [ids.localId, ids.globalId, String(ids.localId)], (err, rows) => {
            if (err) {
                console.error("Error fetching sale returns:", err);
                reject(err);
            } else {
                const mapped = rows.map(row => ({
                    ...row,
                    invoiceNo: row.invoice_no,
                    totalAmount: row.total_amount || 0,
                    subTotal: row.sub_total || 0,
                    saleId: row.sale_id,
                    customerId: row.customer_id,
                    customer: { name: row.customer_name },
                    items: row.items ? JSON.parse(row.items) : []
                }));
                resolve(mapped);
            }
        });
    });
});

ipcMain.handle("add-sale-return", async (e, data) => {
    return new Promise((resolve, reject) => {
        const customer_id = data.customer_id || data.customerId;
        const sale_id = data.sale_id || data.saleId;
        const invoice_no = data.invoice_no || data.invoiceNo || `SR-${Date.now()}`;
        const sub_total = data.sub_total || data.subTotal || 0;
        const tax = data.tax || 0;
        const total_amount = data.total_amount || data.totalAmount || 0;
        const notes = data.notes || "";
        const items = data.items || [];
        const companyId = data.companyId || data.company_id;

        const tempId = randomUUID();

        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            db.run(
                `INSERT INTO sale_returns (global_id, customer_id, sale_id, invoice_no, sub_total, tax, total_amount, notes, company_id, sync_status, date, updated_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                [tempId, customer_id, sale_id, invoice_no, sub_total, tax, total_amount, notes, companyId],
                function (err) {
                    if (err) {
                        db.run("ROLLBACK");
                        return reject({ success: false, message: err.message });
                    }

                    const returnId = this.lastID;

                    // Add items and Update Stock
                    if (items && Array.isArray(items)) {
                        const itemStmt = db.prepare(`INSERT INTO sale_return_items (global_id, return_id, product_id, quantity, price, total) 
                                               VALUES (?, ?, ?, ?, ?, ?)`);
                        const stockStmt = db.prepare(`UPDATE products SET stock_quantity = stock_quantity + ?, sync_status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE id = ? OR global_id = ?`);

                        items.forEach(item => {
                            const pid = item.productId || item.product_id;
                            const qty = parseInt(item.quantity || 0);

                            itemStmt.run(
                                randomUUID(),
                                tempId,
                                pid,
                                qty,
                                item.price || item.unit_price,
                                item.total || (qty * (item.price || item.unit_price || 0))
                            );

                            // For Sale Return, Stock INCREASES
                            stockStmt.run(qty, pid, pid);
                        });
                        itemStmt.finalize();
                        stockStmt.finalize();
                    }

                    // Update Customer Balance (Decrease Receivable)
                    if (customer_id) {
                        db.run(`UPDATE customers SET current_balance = current_balance - ?, sync_status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE id = ? OR global_id = ?`, [total_amount, customer_id, customer_id]);
                    }

                    db.run("COMMIT", (commitErr) => {
                        if (commitErr) {
                            db.run("ROLLBACK");
                            return reject({ success: false, message: commitErr.message });
                        }
                        syncService.syncPendingRecords();
                        resolve({ success: true, id: returnId, global_id: tempId, message: "Sale return recorded locally, stock updated, and balance adjusted." });
                    });
                }
            );
        });
    });
});

ipcMain.handle("delete-sale-return", async (e, id) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM sale_returns WHERE id = ? OR global_id = ?", [id, id], (err, row) => {
            if (err || !row) return reject("Sale return not found");
            const gid = row.global_id;
            const customer_id = row.customer_id;
            const total_amount = row.total_amount || 0;

            db.all("SELECT * FROM sale_return_items WHERE return_id = ?", [gid], (itemErr, items) => {
                db.serialize(() => {
                    db.run("BEGIN TRANSACTION");

                    // 1. Reverse Stock (Decrease Stock, as we are cancelling the return)
                    if (items && items.length > 0) {
                        const stockStmt = db.prepare("UPDATE products SET stock_quantity = stock_quantity - ?, sync_status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE id=? OR global_id=?");
                        items.forEach(item => stockStmt.run(item.quantity, item.product_id, item.product_id));
                        stockStmt.finalize();
                    }

                    // 2. Reverse Customer Balance (Increase Receivable, as we are cancelling the credit)
                    if (customer_id) {
                        db.run(`UPDATE customers SET current_balance = current_balance + ?, sync_status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE id = ? OR global_id = ?`, [total_amount, customer_id, customer_id]);
                    }

                    // 3. Mark as Deleted
                    db.run("UPDATE sale_returns SET sync_status = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE global_id = ?", [gid], (err) => {
                        if (err) {
                            db.run("ROLLBACK");
                            return reject(err);
                        }
                        db.run("COMMIT", (commitErr) => {
                            if (commitErr) {
                                db.run("ROLLBACK");
                                return reject(commitErr);
                            }
                            syncService.syncPendingRecords();
                            resolve({ success: true, message: "Sale return deleted, stock and balance reverted." });
                        });
                    });
                });
            });
        });
    });
});

// ==========================================
// RETURNS - Purchase Returns - LOCAL FIRST
// ==========================================
ipcMain.handle("get-purchase-returns", async (e, companyId) => {
    const ids = await resolveCompanyIds(companyId);
    return new Promise((resolve, reject) => {
        const query = `
            SELECT pr.*, v.name as vendor_name,
                   (SELECT json_group_array(json_object(
                       'productId', pri.product_id,
                       'quantity', pri.quantity,
                       'unitCost', pri.unit_cost,
                       'total', pri.total,
                       'name', p.name
                   )) FROM purchase_return_items pri 
                   LEFT JOIN products p ON pri.product_id = p.id OR pri.product_id = p.global_id
                   WHERE pri.return_id = pr.global_id OR pri.return_id = pr.id) as items
            FROM purchase_returns pr
            LEFT JOIN vendors v ON pr.vendor_id = v.id OR pr.vendor_id = v.global_id
            WHERE (pr.company_id = ? OR pr.company_id = ? OR pr.company_id = ?) 
              AND (pr.sync_status != 'deleted' OR pr.sync_status IS NULL)
            ORDER BY pr.date DESC
        `;
        db.all(query, [ids.localId, ids.globalId, String(ids.localId)], (err, rows) => {
            if (err) {
                console.error("Error fetching purchase returns:", err);
                reject(err);
            } else {
                const mapped = rows.map(row => ({
                    ...row,
                    invoiceNo: row.invoice_no,
                    totalAmount: row.total_amount || 0,
                    subTotal: row.sub_total || 0,
                    purchaseId: row.purchase_id,
                    vendorId: row.vendor_id,
                    vendor: { name: row.vendor_name },
                    items: row.items ? JSON.parse(row.items) : []
                }));
                resolve(mapped);
            }
        });
    });
});

ipcMain.handle("add-purchase-return", async (e, data) => {
    return new Promise((resolve, reject) => {
        const vendor_id = data.vendor_id || data.vendorId;
        const purchase_id = data.purchase_id || data.purchaseId;
        const invoice_no = data.invoice_no || data.invoiceNo || `PR-${Date.now()}`;
        const sub_total = data.sub_total || data.subTotal || 0;
        const tax = data.tax || 0;
        const total_amount = data.total_amount || data.totalAmount || 0;
        const notes = data.notes || "";
        const items = data.items || [];
        const companyId = data.companyId || data.company_id;

        const tempId = randomUUID();

        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            db.run(
                `INSERT INTO purchase_returns (global_id, vendor_id, purchase_id, invoice_no, sub_total, tax, total_amount, notes, company_id, sync_status, date, updated_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                [tempId, vendor_id, purchase_id, invoice_no, sub_total, tax, total_amount, notes, companyId],
                function (err) {
                    if (err) {
                        db.run("ROLLBACK");
                        return reject({ success: false, message: err.message });
                    }

                    const returnId = this.lastID;

                    // Add items and Update Stock
                    if (items && Array.isArray(items)) {
                        const itemStmt = db.prepare(`INSERT INTO purchase_return_items (global_id, return_id, product_id, quantity, unit_cost, total) 
                                               VALUES (?, ?, ?, ?, ?, ?)`);
                        const stockStmt = db.prepare(`UPDATE products SET stock_quantity = stock_quantity - ?, sync_status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE id = ? OR global_id = ?`);

                        items.forEach(item => {
                            const pid = item.productId || item.product_id;
                            const qty = parseInt(item.quantity || 0);
                            const uCost = item.unit_cost || item.unitCost || item.price || 0;

                            itemStmt.run(
                                randomUUID(),
                                tempId,
                                pid,
                                qty,
                                uCost,
                                item.total || (qty * uCost)
                            );

                            // For Purchase Return, Stock DECREASES
                            stockStmt.run(qty, pid, pid);
                        });
                        itemStmt.finalize();
                        stockStmt.finalize();
                    }

                    // Update Vendor Balance (Decrease Payable)
                    if (vendor_id) {
                        db.run(`UPDATE vendors SET current_balance = current_balance - ?, sync_status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE id = ? OR global_id = ?`, [total_amount, vendor_id, vendor_id]);
                    }

                    db.run("COMMIT", (commitErr) => {
                        if (commitErr) {
                            db.run("ROLLBACK");
                            return reject({ success: false, message: commitErr.message });
                        }
                        syncService.syncPendingRecords();
                        resolve({ success: true, id: returnId, global_id: tempId, message: "Purchase return recorded locally, stock updated, and balance adjusted." });
                    });
                }
            );
        });
    });
});

ipcMain.handle("delete-purchase-return", async (e, id) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM purchase_returns WHERE id = ? OR global_id = ?", [id, id], (err, row) => {
            if (err || !row) return reject("Purchase return not found");
            const gid = row.global_id;
            const vendor_id = row.vendor_id;
            const total_amount = row.total_amount || 0;

            db.all("SELECT * FROM purchase_return_items WHERE return_id = ?", [gid], (itemErr, items) => {
                db.serialize(() => {
                    db.run("BEGIN TRANSACTION");

                    // 1. Reverse Stock (Increase Stock, as we are cancelling the return - product comes back to us? No, wait)
                    // Purchase Return Deletion: We sent goods back. Now we say "No, we didn't send them back".
                    // So goods are back in our inventory. So INCREASE stock.
                    if (items && items.length > 0) {
                        const stockStmt = db.prepare("UPDATE products SET stock_quantity = stock_quantity + ?, sync_status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE id=? OR global_id=?");
                        items.forEach(item => stockStmt.run(item.quantity, item.product_id, item.product_id));
                        stockStmt.finalize();
                    }

                    // 2. Reverse Vendor Balance (Increase Payable, as we are cancelling the debit note)
                    if (vendor_id) {
                        db.run(`UPDATE vendors SET current_balance = current_balance + ?, sync_status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE id = ? OR global_id = ?`, [total_amount, vendor_id, vendor_id]);
                    }

                    db.run("UPDATE purchase_returns SET sync_status = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE global_id = ?", [gid], (err) => {
                        if (err) {
                            db.run("ROLLBACK");
                            return reject(err);
                        }
                        db.run("COMMIT", (commitErr) => {
                            if (commitErr) {
                                db.run("ROLLBACK");
                                return reject(commitErr);
                            }
                            syncService.syncPendingRecords();
                            resolve({ success: true, message: "Purchase return deleted, stock and balance reverted." });
                        });
                    });
                });
            });
        });
    });
});


// Admin Messages
ipcMain.handle("get-admin-messages", (e, params) => apiCall('get', '/admin-messages', null, params));
ipcMain.handle("send-admin-message", (e, data) => apiCall('post', '/admin-messages', data));

// Support Requests
ipcMain.handle("get-support-requests", (e, params) => apiCall('get', '/support-requests', null, params));
ipcMain.handle("create-support-request", (e, data) => apiCall('post', '/support-requests', data));
ipcMain.handle("update-support-status", (e, id, status) => apiCall('put', `/support-requests/${id}`, { status }));

// Backup & Restore Handlers
ipcMain.handle("create-backup", async (e, companyId) => {
    try {
        const { filePath } = await dialog.showSaveDialog({
            title: 'Export System Data',
            defaultPath: `bms_backup_${new Date().toISOString().split('T')[0]}.json`,
            filters: [{ name: 'JSON Backup', extensions: ['json'] }]
        });

        if (!filePath) return { success: false, message: "Backup cancelled" };

        const data = {};

        // Fetch all relevant data from cloud
        const endpoints = [
            { key: 'company', url: `/companies/${companyId}` },
            { key: 'employees', url: '/employees', params: { companyId } },
            { key: 'categories', url: '/categories', params: { companyId } },
            { key: 'vendors', url: '/vendors', params: { companyId } },
            { key: 'products', url: '/products', params: { companyId } },
            { key: 'customers', url: '/customers', params: { companyId } },
            { key: 'sales', url: '/sales', params: { companyId } },
            { key: 'purchases', url: '/purchases', params: { companyId } },
            { key: 'expenses', url: '/expenses', params: { companyId } },
            { key: 'attendance', url: '/attendance', params: { companyId } },
        ];

        for (const ep of endpoints) {
            const res = await apiCall('get', ep.url, null, ep.params);
            data[ep.key] = res;
        }

        const fs = require('fs');
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

        return { success: true, message: `Backup saved to ${filePath}` };
    } catch (error) {
        console.error("Backup Error:", error);
        return { success: false, message: error.message };
    }
});

ipcMain.handle("restore-backup", async (e, companyId) => {
    try {
        const { filePaths } = await dialog.showOpenDialog({
            title: 'Restore System Data',
            filters: [{ name: 'JSON Backup', extensions: ['json'] }],
            properties: ['openFile']
        });

        if (!filePaths || filePaths.length === 0) return { success: false, message: "No file selected" };

        const fs = require('fs');
        const data = JSON.parse(fs.readFileSync(filePaths[0], 'utf8'));

        const confirm = await dialog.showMessageBox({
            type: 'warning',
            title: 'Confirm Restoration',
            message: 'You are about to restore data. This will add all records from the backup file to your current cloud database. This process cannot be undone. Proceed?',
            buttons: ['Cancel', 'Proceed Restore']
        });

        if (confirm.response === 0) return { success: false, message: "Restore cancelled" };

        // Simple import logic (Note: This doesn't handle duplicates or complex ID re-mapping)
        // In a real scenario, this would be much more complex.
        const summary = { success: 0, failed: 0 };

        // Priority order for import to maintain relationships
        const importOrder = [
            { key: 'categories', url: '/categories' },
            { key: 'vendors', url: '/vendors' },
            { key: 'products', url: '/products' },
            { key: 'customers', url: '/customers' },
            { key: 'employees', url: '/employees' },
            { key: 'expenses', url: '/expenses' },
            // Sales and Purchases are complex due to nested items, 
            // the cloud API for creation usually handles nested items.
            { key: 'sales', url: '/sales' },
            { key: 'purchases', url: '/purchases' },
        ];

        for (const item of importOrder) {
            const records = data[item.key];
            if (Array.isArray(records)) {
                for (const rec of records) {
                    // Remove existing IDs and set correct companyId
                    const { id, companyId: cid, ...payload } = rec;
                    payload.companyId = companyId;

                    const res = await apiCall('post', item.url, payload);
                    if (res && res.id) summary.success++;
                    else summary.failed++;
                }
            }
        }

        return {
            success: true,
            message: `Restoration complete. ${summary.success} records imported, ${summary.failed} failed.`
        };
    } catch (error) {
        console.error("Restore Error:", error);
        return { success: false, message: error.message };
    }
});

// Reports - LOCAL FIRST
ipcMain.handle("get-report-summary", async (e, params) => {
    const rawCid = typeof params === 'object' ? params.companyId : params;
    const ids = await resolveCompanyIds(rawCid);
    let companyMatch = `(company_id = ? OR company_id = ? OR company_id = ?)`;
    let qParams = [ids.localId, ids.globalId, String(ids.localId)];

    if (ids.localId === null && ids.globalId === null) {
        companyMatch = `1=1`;
        qParams = [];
    }

    const period = typeof params === 'object' ? params.period : 'Monthly';
    const startDate = params?.startDate;
    const endDate = params?.endDate;
    const customerId = params?.customerId;
    const vendorId = params?.vendorId;
    const paymentStatus = params?.paymentStatus;
    const categoryId = params?.categoryId;
    const stockStatus = params?.stockStatus;
    const expenseCategory = params?.expenseCategory;
    const employeeId = params?.employeeId;

    console.log('[REPORT DEBUG] Params:', JSON.stringify(params));
    console.log('[REPORT DEBUG] IDs:', ids);


    let dateFilter = "";
    const now = new Date();

    const normalizeDate = (d) => {
        if (!d) return null;
        // If it's ISO like 2026-02-13T07:09:18.000Z, we want 2026-02-13 07:09:18 or just 2026-02-13
        let clean = d.replace('T', ' ').split('.')[0].replace('Z', '');
        return clean;
    };

    if (startDate && endDate) {
        const startStr = normalizeDate(startDate).includes(' ') ? normalizeDate(startDate) : `${normalizeDate(startDate)} 00:00:00`;
        const endStr = normalizeDate(endDate).includes(' ') ? normalizeDate(endDate) : `${normalizeDate(endDate)} 23:59:59`;
        dateFilter = ` AND sale_date BETWEEN '${startStr}' AND '${endStr}'`;
    } else {
        if (period === 'Daily') {
            dateFilter = ` AND sale_date >= '${now.toISOString().split('T')[0]} 00:00:00'`;
        } else if (period === 'Weekly') {
            const lastWeek = new Date(new Date().setDate(now.getDate() - 7)).toISOString().split('T')[0];
            dateFilter = ` AND sale_date >= '${lastWeek} 00:00:00'`;
        } else if (period === 'Monthly') {
            const lastMonth = new Date(new Date().setMonth(now.getMonth() - 1)).toISOString().split('T')[0];
            dateFilter = ` AND sale_date >= '${lastMonth} 00:00:00'`;
        } else if (period === 'Yearly') {
            const lastYear = new Date(new Date().setFullYear(now.getFullYear() - 1)).toISOString().split('T')[0];
            dateFilter = ` AND sale_date >= '${lastYear} 00:00:00'`;
        }
    }

    const stats = {
        totalSales: 0,
        salesCount: 0,
        totalExpenses: 0,
        expenseCount: 0,
        totalPurchases: 0,
        purchaseCount: 0,
        totalReturns: 0,
        returnCount: 0,
        totalSalesReturns: 0,
        totalPurchaseReturns: 0,
        totalPayables: 0,
        vendorCount: 0,
        totalSalaries: 0,
        employeeCount: 0,
        netProfit: 0,
        totalCOGS: 0,
        inventoryValuationCost: 0,
        inventoryValuationSell: 0,
        lowStockCount: 0,
        inStockCount: 0,
        expiringSoonCount: 0,
        expiredCount: 0,
        recentDays: [],
        topProducts: [],
        topCustomers: [],
        topVendors: [],
        topPurchasedProducts: [],
        topValuedItems: [],
        expenseCategoryBreakdown: {},
        detailedSales: [],
        detailedPurchases: [],
        detailedInventory: [],
        detailedExpenses: [],
        detailedReturns: [],
        detailedVendors: [],
        detailedHRM: [],
        topStaff: []
    };

    const dbGet = (sql, p) => new Promise(res => db.get(sql, p, (err, row) => res(row)));
    const dbAll = (sql, p) => new Promise(res => db.all(sql, p, (err, rows) => res(rows || [])));

    try {
        // 1. Basic Stats
        let salesSql = `SELECT SUM(grand_total) as total, COUNT(*) as count FROM sales WHERE ${companyMatch} ${dateFilter}`;
        let salesP = [...qParams];
        if (customerId && customerId !== 'all') {
            salesSql += ` AND (customer_id = ? OR customer_id = (SELECT id FROM customers WHERE global_id = ?))`;
            salesP.push(customerId, customerId);
        }
        if (paymentStatus && paymentStatus !== 'all') {
            salesSql += ` AND LOWER(payment_status) = ?`;
            salesP.push(paymentStatus.toLowerCase());
        }
        const sRow = await dbGet(salesSql, salesP);
        stats.totalSales = sRow?.total || 0;
        stats.salesCount = sRow?.count || 0;

        let purSql = `SELECT SUM(total_amount) as total, COUNT(*) as count FROM purchases WHERE ${companyMatch} ${dateFilter.replace(/sale_date/g, 'purchase_date')}`;
        let purP = [...qParams];
        if (vendorId && vendorId !== 'all') {
            purSql += ` AND (vendor_id = ? OR vendor_id = (SELECT id FROM vendors WHERE global_id = ?))`;
            purP.push(vendorId, vendorId);
        }
        if (paymentStatus && paymentStatus !== 'all') {
            purSql += ` AND LOWER(payment_status) = ?`;
            purP.push(paymentStatus.toLowerCase());
        }
        const pRow = await dbGet(purSql, purP);
        stats.totalPurchases = pRow?.total || 0;
        stats.purchaseCount = pRow?.count || 0;

        let expSql = `SELECT SUM(amount) as total, COUNT(*) as count FROM expenses WHERE ${companyMatch} ${dateFilter.replace(/sale_date/g, 'date')}`;
        let expP = [...qParams];
        if (expenseCategory && expenseCategory !== 'all') {
            expSql += ` AND category = ?`;
            expP.push(expenseCategory);
        }
        const eRow = await dbGet(expSql, expP);
        stats.totalExpenses = eRow?.total || 0;
        stats.expenseCount = eRow?.count || 0;

        const expBreakdown = await dbAll(`SELECT category, SUM(amount) as total FROM expenses WHERE ${companyMatch} ${dateFilter.replace(/sale_date/g, 'date')} GROUP BY category`, qParams);
        expBreakdown.forEach(r => stats.expenseCategoryBreakdown[r.category || 'General'] = r.total);

        // 2. Returns
        const srRow = await dbGet(`SELECT SUM(total_amount) as total, COUNT(*) as count FROM sale_returns WHERE ${companyMatch} ${dateFilter.replace(/sale_date/g, 'date')}`, qParams);
        stats.totalSalesReturns = srRow?.total || 0;
        stats.returnCount += (srRow?.count || 0);

        const prRow = await dbGet(`SELECT SUM(total_amount) as total, COUNT(*) as count FROM purchase_returns WHERE ${companyMatch} ${dateFilter.replace(/sale_date/g, 'date')}`, qParams);
        stats.totalPurchaseReturns = prRow?.total || 0;
        stats.returnCount += (prRow?.count || 0);
        stats.totalReturns = stats.totalSalesReturns + stats.totalPurchaseReturns;

        // 3. Inventory
        const invRow = await dbGet(`SELECT SUM(stock_quantity * cost_price) as cost_val, SUM(stock_quantity * sell_price) as sell_val, 
                COUNT(CASE WHEN stock_quantity <= alert_threshold THEN 1 END) as low,
                COUNT(CASE WHEN stock_quantity > 0 THEN 1 END) as in_stock,
                COUNT(CASE WHEN expiry_date IS NOT NULL AND expiry_date <= date('now', '+30 days') THEN 1 END) as expiring,
                COUNT(CASE WHEN expiry_date IS NOT NULL AND expiry_date <= date('now') THEN 1 END) as expired
                FROM products WHERE ${companyMatch} AND sync_status != 'deleted'`, qParams);
        stats.inventoryValuationCost = invRow?.cost_val || 0;
        stats.inventoryValuationSell = invRow?.sell_val || 0;
        stats.lowStockCount = invRow?.low || 0;
        stats.inStockCount = invRow?.in_stock || 0;
        stats.expiringSoonCount = invRow?.expiring || 0;
        stats.expiredCount = invRow?.expired || 0;

        let cogsSql = `SELECT SUM(si.quantity * p.cost_price) as total_cogs
            FROM sale_items si
            JOIN sales s ON si.sale_id = s.id OR si.sale_id = s.global_id
            JOIN products p ON si.product_id = p.id OR si.product_id = p.global_id
            WHERE s.${companyMatch} ${dateFilter.replace(/sale_date/g, 's.sale_date')}`;
        let cogsP = [...qParams];
        if (customerId && customerId !== 'all') {
            cogsSql += ` AND (s.customer_id = ? OR s.customer_id = (SELECT id FROM customers WHERE global_id = ?))`;
            cogsP.push(customerId, customerId);
        }
        const cRow = await dbGet(cogsSql, cogsP);
        stats.totalCOGS = cRow?.total_cogs || 0;

        // 4. HRM & Vendors
        const vRow = await dbGet(`SELECT SUM(current_balance) as total, COUNT(*) as count FROM vendors WHERE ${companyMatch} AND sync_status != 'deleted'`, qParams);
        stats.totalPayables = vRow?.total || 0;
        stats.vendorCount = vRow?.count || 0;

        const salRow = await dbGet(`SELECT SUM(net_salary) as total FROM salary_records WHERE ${companyMatch} ${dateFilter.replace(/sale_date/g, 'payment_date')}`, qParams);
        stats.totalSalaries = salRow?.total || 0;

        const empRow = await dbGet(`SELECT COUNT(*) as count FROM employees WHERE ${companyMatch} AND is_active = 1 AND sync_status != 'deleted'`, qParams);
        stats.employeeCount = empRow?.count || 0;

        // 4.1 Detailed HRM / Salaries
        let hrmSql = `SELECT s.*, e.first_name || ' ' || e.last_name as staff_name, e.designation 
                      FROM salary_records s 
                      JOIN employees e ON s.employee_id = e.id OR s.employee_id = e.global_id 
                      WHERE ${companyMatch.replace(/company_id/g, 's.company_id')} ${dateFilter.replace(/sale_date/g, 'date(s.payment_date)')}`;
        let hrmP = [...qParams];
        if (employeeId && employeeId !== 'all') {
            hrmSql += ` AND (s.employee_id = ? OR s.employee_id = (SELECT id FROM employees WHERE global_id = ?))`;
            hrmP.push(employeeId, employeeId);
        }
        const detHRM = await dbAll(hrmSql + " ORDER BY s.payment_date DESC LIMIT 100", hrmP);
        stats.detailedHRM = detHRM.map(r => ({
            ...r,
            staffName: r.staff_name,
            amount: r.net_salary,
            date: r.payment_date,
            basic_salary: r.base_salary || 0
        }));

        // 5. Detailed Lists (MAPPED)

        // 5. Detailed Lists (MAPPED)
        let detSalesSql = `SELECT s.*, c.name as customer_name FROM sales s LEFT JOIN customers c ON s.customer_id = c.id OR s.customer_id = c.global_id WHERE ${companyMatch.replace(/company_id/g, 's.company_id')} ${dateFilter.replace(/sale_date/g, 's.sale_date')}`;
        let detSalesP = [...qParams];
        if (customerId && customerId !== 'all') {
            detSalesSql += ` AND (s.customer_id = ? OR s.customer_id = (SELECT id FROM customers WHERE global_id = ?))`;
            detSalesP.push(customerId, customerId);
        }
        if (paymentStatus && paymentStatus !== 'all') {
            detSalesSql += ` AND LOWER(s.payment_status) = ?`;
            detSalesP.push(paymentStatus.toLowerCase());
        }
        const detSales = await dbAll(detSalesSql + " ORDER BY s.sale_date DESC LIMIT 100", detSalesP);
        for (const r of detSales) {
            const items = await dbAll(`SELECT si.*, p.name FROM sale_items si JOIN products p ON si.product_id = p.id OR si.product_id = p.global_id WHERE si.sale_id = ? OR si.sale_id = ?`, [r.id, r.global_id]);
            stats.detailedSales.push({
                ...r,
                date: r.sale_date,
                invoiceNo: r.inv_number,
                grandTotal: r.grand_total,
                totalAmount: r.total_amount,
                paymentStatus: r.payment_status,
                customer: { name: r.customer_name || 'Walk-in' },
                items: items
            });
        }

        let detPurSql = `SELECT p.*, v.name as vendor_name FROM purchases p LEFT JOIN vendors v ON p.vendor_id = v.id OR p.vendor_id = v.global_id WHERE ${companyMatch.replace(/company_id/g, 'p.company_id')} ${dateFilter.replace(/sale_date/g, 'p.purchase_date')}`;
        let detPurP = [...qParams];
        if (vendorId && vendorId !== 'all') {
            detPurSql += ` AND (p.vendor_id = ? OR p.vendor_id = (SELECT id FROM vendors WHERE global_id = ?))`;
            detPurP.push(vendorId, vendorId);
        }
        if (paymentStatus && paymentStatus !== 'all') {
            detPurSql += ` AND LOWER(p.payment_status) = ?`;
            detPurP.push(paymentStatus.toLowerCase());
        }
        const detPurchases = await dbAll(detPurSql + " ORDER BY p.purchase_date DESC LIMIT 100", detPurP);
        for (const r of detPurchases) {
            const items = await dbAll(`SELECT pi.*, pr.name FROM purchase_items pi JOIN products pr ON pi.product_id = pr.id OR pi.product_id = pr.global_id WHERE pi.purchase_id = ? OR pi.purchase_id = ?`, [r.id, r.global_id]);
            stats.detailedPurchases.push({
                ...r,
                date: r.purchase_date,
                invoiceNo: r.ref_number,
                grandTotal: r.total_amount,
                totalAmount: r.total_amount,
                paymentStatus: r.payment_status,
                vendor: { name: r.vendor_name || 'Unknown' },
                items: items
            });
        }

        let detInvSql = `SELECT p.*, c.name as cat_name FROM products p LEFT JOIN categories c ON p.category_id = c.id OR p.category_id = c.global_id WHERE ${companyMatch.replace(/company_id/g, 'p.company_id')} AND p.sync_status != 'deleted'`;
        let detInvP = [...qParams];
        if (categoryId && categoryId !== 'all') {
            detInvSql += ` AND (p.category_id = ? OR p.category_id = (SELECT id FROM categories WHERE global_id = ?))`;
            detInvP.push(categoryId, categoryId);
        }
        if (stockStatus === 'low') detInvSql += ` AND p.stock_quantity <= p.alert_threshold`;
        else if (stockStatus === 'out') detInvSql += ` AND p.stock_quantity <= 0`;
        else if (stockStatus === 'expired') detInvSql += ` AND p.expiry_date <= date('now')`;

        const detInv = await dbAll(detInvSql + " LIMIT 100", detInvP);
        stats.detailedInventory = detInv.map(r => ({ ...r, category: { name: r.cat_name }, costPrice: r.cost_price, sell_price: r.sell_price, stockQty: r.stock_quantity, alertQty: r.alert_threshold }));

        let detExpSql = `SELECT * FROM expenses WHERE ${companyMatch} ${dateFilter.replace(/sale_date/g, 'date')}`;
        let detExpP = [...qParams];
        if (expenseCategory && expenseCategory !== 'all' && expenseCategory !== 'Staff Payroll') {
            detExpSql += ` AND category = ?`;
            detExpP.push(expenseCategory);
        }
        const detExpRaw = await dbAll(detExpSql + " LIMIT 100", detExpP);
        stats.detailedExpenses = detExpRaw;

        // If Staff Payroll, add salary records to expenses
        if (expenseCategory === 'Staff Payroll') {
            const salaries = await dbAll(`SELECT s.*, e.first_name || ' ' || e.last_name as title, 'Staff Payroll' as category, s.net_salary as amount, s.payment_date as date 
                    FROM salary_records s 
                    JOIN employees e ON s.employee_id = e.id OR s.employee_id = e.global_id 
                    WHERE ${companyMatch.replace(/company_id/g, 's.company_id')} ${dateFilter.replace(/sale_date/g, 's.payment_date')}`, qParams);
            stats.detailedExpenses = salaries;
        }

        // Detailed Returns
        const sReturns = await dbAll(`SELECT r.*, 'Sale Return' as type, c.name as party, r.total_amount as amount, r.invoice_no as invoiceNo, r.date as date
                FROM sale_returns r 
                LEFT JOIN customers c ON r.customer_id = c.id OR r.customer_id = c.global_id 
                WHERE ${companyMatch.replace(/company_id/g, 'r.company_id')} ${dateFilter.replace(/sale_date/g, 'r.date')}`, qParams);
        for (const r of sReturns) {
            const itms = await dbAll(`SELECT ri.*, p.name FROM sale_return_items ri JOIN products p ON ri.product_id = p.id OR ri.product_id = p.global_id WHERE ri.return_id = ? OR ri.return_id = ?`, [r.id, r.global_id]);
            stats.detailedReturns.push({ ...r, party: r.party || 'Walk-in', returnDetail: itms.map(i => `${i.name} (x${i.quantity})`).join(', ') });
        }

        const pReturns = await dbAll(`SELECT r.*, 'Purchase Return' as type, v.name as party, r.total_amount as amount, r.invoice_no as invoiceNo, r.date as date
                FROM purchase_returns r 
                LEFT JOIN vendors v ON r.vendor_id = v.id OR r.vendor_id = v.global_id 
                WHERE ${companyMatch.replace(/company_id/g, 'r.company_id')} ${dateFilter.replace(/sale_date/g, 'r.date')}`, qParams);
        for (const r of pReturns) {
            const itms = await dbAll(`SELECT ri.*, p.name FROM purchase_return_items ri JOIN products p ON ri.product_id = p.id OR ri.product_id = p.global_id WHERE ri.return_id = ? OR ri.return_id = ?`, [r.id, r.global_id]);
            stats.detailedReturns.push({ ...r, party: r.party || 'Unknown', returnDetail: itms.map(i => `${i.name} (x${i.quantity})`).join(', ') });
        }

        // Detailed Vendors
        let detVendSql = `SELECT * FROM vendors WHERE ${companyMatch} AND sync_status != 'deleted'`;
        let detVendP = [...qParams];
        if (vendorId && vendorId !== 'all') {
            detVendSql += ` AND (id = ? OR global_id = ?)`;
            detVendP.push(vendorId, vendorId);
        }
        // Payment status filter for vendors: credit = due (balance > 0), paid = clear (balance = 0)
        if (paymentStatus && paymentStatus !== 'all') {
            if (paymentStatus.toLowerCase() === 'credit') {
                detVendSql += ` AND current_balance > 0`;
            } else if (paymentStatus.toLowerCase() === 'paid') {
                detVendSql += ` AND (current_balance = 0 OR current_balance IS NULL)`;
            }
        }
        const detVendors = await dbAll(detVendSql + " ORDER BY name ASC", detVendP);
        stats.detailedVendors = detVendors.map(v => ({
            ...v,
            balance: v.current_balance || v.balance || 0
        }));

        // 6. Trend
        const trendPoints = 7;
        const startT = startDate ? new Date(startDate).getTime() : new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).getTime();
        const endT = endDate ? new Date(endDate).getTime() : now.getTime();
        const step = (endT - startT) / trendPoints;

        for (let i = 0; i <= trendPoints; i++) {
            const d = new Date(startT + i * step);
            const dStr = d.toISOString().split('T')[0];

            let dSSql = `SELECT SUM(grand_total) as t, COUNT(*) as c FROM sales WHERE ${companyMatch} AND date(sale_date) = ?`;
            let dSP = [...qParams, dStr];
            if (customerId && customerId !== 'all') {
                dSSql += ` AND (customer_id = ? OR customer_id = (SELECT id FROM customers WHERE global_id = ?))`;
                dSP.push(customerId, customerId);
            }
            if (paymentStatus && paymentStatus !== 'all') {
                dSSql += ` AND LOWER(payment_status) = ?`;
                dSP.push(paymentStatus.toLowerCase());
            }
            const dS = await dbGet(dSSql, dSP);

            let dPSql = `SELECT SUM(total_amount) as t FROM purchases WHERE ${companyMatch} AND date(purchase_date) = ?`;
            let dPP = [...qParams, dStr];
            if (vendorId && vendorId !== 'all') {
                dPSql += ` AND (vendor_id = ? OR vendor_id = (SELECT id FROM vendors WHERE global_id = ?))`;
                dPP.push(vendorId, vendorId);
            }
            if (paymentStatus && paymentStatus !== 'all') {
                dPSql += ` AND LOWER(payment_status) = ?`;
                dPP.push(paymentStatus.toLowerCase());
            }
            const dP = await dbGet(dPSql, dPP);

            const dE = await dbGet(`SELECT SUM(amount) as t FROM expenses WHERE ${companyMatch} AND date(date) = ?`, [...qParams, dStr]);

            // Payables calculation - sum of current_balance for vendors with purchases on this date
            let dPaySql = `SELECT SUM(DISTINCT v.current_balance) as t 
                           FROM vendors v 
                           WHERE ${companyMatch.replace(/company_id/g, 'v.company_id')} 
                           AND v.sync_status != 'deleted'`;
            let dPayP = [...qParams];
            if (vendorId && vendorId !== 'all') {
                dPaySql += ` AND (v.id = ? OR v.global_id = ?)`;
                dPayP.push(vendorId, vendorId);
            }
            const dPay = await dbGet(dPaySql, dPayP);

            stats.recentDays.push({
                date: dStr,
                sales: dS?.t || 0,
                invoices: dS?.c || 0,
                purchases: dP?.t || 0,
                expenses: dE?.t || 0,
                profit: (dS?.t || 0) - (dE?.t || 0),
                payables: dPay?.t || 0
            });
        }

        // 7. Top Breakdowns
        let topProdSql = `SELECT p.name, SUM(si.quantity) as qtySold, SUM(si.total_price) as totalValue 
                          FROM sale_items si 
                          JOIN products p ON si.product_id = p.id OR si.product_id = p.global_id 
                          JOIN sales s ON si.sale_id = s.id OR si.sale_id = s.global_id 
                          WHERE s.${companyMatch} ${dateFilter.replace(/sale_date/g, 's.sale_date')}`;
        let topProdP = [...qParams];
        if (customerId && customerId !== 'all') {
            topProdSql += ` AND (s.customer_id = ? OR s.customer_id = (SELECT id FROM customers WHERE global_id = ?))`;
            topProdP.push(customerId, customerId);
        }
        stats.topProducts = await dbAll(topProdSql + ` GROUP BY p.name ORDER BY qtySold DESC LIMIT 5`, topProdP);

        stats.topCustomers = await dbAll(`SELECT IFNULL(c.name, 'Walk-in') as name, SUM(s.grand_total) as totalSpent FROM sales s LEFT JOIN customers c ON s.customer_id = c.id OR s.customer_id = c.global_id WHERE ${companyMatch.replace(/company_id/g, 's.company_id')} ${dateFilter.replace(/sale_date/g, 's.sale_date')} GROUP BY IFNULL(c.name, 'Walk-in') ORDER BY totalSpent DESC LIMIT 5`, qParams);

        let topVendSql = `SELECT v.name, SUM(p.total_amount) as totalSpent FROM purchases p JOIN vendors v ON p.vendor_id = v.id OR p.vendor_id = v.global_id WHERE ${companyMatch.replace(/company_id/g, 'p.company_id')} ${dateFilter.replace(/sale_date/g, 'p.purchase_date')}`;
        let topVendP = [...qParams];
        if (vendorId && vendorId !== 'all') {
            topVendSql += ` AND (p.vendor_id = ? OR p.vendor_id = (SELECT id FROM vendors WHERE global_id = ?))`;
            topVendP.push(vendorId, vendorId);
        }
        if (paymentStatus && paymentStatus !== 'all') {
            topVendSql += ` AND LOWER(p.payment_status) = ?`;
            topVendP.push(paymentStatus.toLowerCase());
        }
        stats.topVendors = await dbAll(topVendSql + ` GROUP BY v.name ORDER BY totalSpent DESC LIMIT 5`, topVendP);

        let topPurProdSql = `SELECT pr.name, SUM(pi.quantity) as qtyBought 
                             FROM purchase_items pi 
                             JOIN products pr ON pi.product_id = pr.id OR pi.product_id = pr.global_id 
                             JOIN purchases p ON pi.purchase_id = p.id OR pi.purchase_id = p.global_id 
                             WHERE p.${companyMatch.replace(/company_id/g, 'p.company_id')} ${dateFilter.replace(/sale_date/g, 'p.purchase_date')}`;
        let topPurProdP = [...qParams];
        if (vendorId && vendorId !== 'all') {
            topPurProdSql += ` AND (p.vendor_id = ? OR p.vendor_id = (SELECT id FROM vendors WHERE global_id = ?))`;
            topPurProdP.push(vendorId, vendorId);
        }
        if (paymentStatus && paymentStatus !== 'all') {
            topPurProdSql += ` AND LOWER(p.payment_status) = ?`;
            topPurProdP.push(paymentStatus.toLowerCase());
        }
        stats.topPurchasedProducts = await dbAll(topPurProdSql + ` GROUP BY pr.name ORDER BY qtyBought DESC LIMIT 5`, topPurProdP);

        const topVal = await dbAll(`SELECT p.name, (stock_quantity * cost_price) as val FROM products p WHERE ${companyMatch} AND sync_status != 'deleted' ORDER BY val DESC LIMIT 5`, qParams);
        stats.topValuedItems = topVal.map(r => ({ name: r.name, costPrice: r.val, stockQty: 1 }));

        stats.topStaff = await dbAll(`SELECT e.first_name || ' ' || e.last_name as name, SUM(s.net_salary) as totalEarned 
                                      FROM salary_records s 
                                      JOIN employees e ON s.employee_id = e.id OR s.employee_id = e.global_id 
                                      WHERE ${companyMatch.replace(/company_id/g, 's.company_id')} ${dateFilter.replace(/sale_date/g, 's.payment_date')} 
                                      GROUP BY name ORDER BY totalEarned DESC LIMIT 5`, qParams);

        stats.netProfit = (stats.totalSales - stats.totalSalesReturns) - stats.totalCOGS - stats.totalExpenses - stats.totalSalaries;
        return { ...stats, success: true };
    } catch (err) {
        console.error("Report Generation Error:", err);
        return { success: false, message: err.message };
    }
});


// Accounts & Accounting
ipcMain.handle("get-accounts", async (e, companyId) => {
    const ids = await resolveCompanyIds(companyId);
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM accounts WHERE (company_id = ? OR company_id = ? OR company_id = ?) AND (sync_status != 'deleted' OR sync_status IS NULL) ORDER BY name ASC", [ids.localId, ids.globalId, String(ids.localId)], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
});

ipcMain.handle("create-account", async (e, data) => {
    return new Promise((resolve, reject) => {
        const { name, type, balance, companyId } = data;
        const tempId = randomUUID();
        db.run(
            `INSERT INTO accounts (global_id, name, type, balance, company_id, sync_status, updated_at) VALUES (?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)`,
            [tempId, name, type, balance || 0, companyId],
            function (err) {
                if (err) return reject({ success: false, message: err.message });
                syncService.syncPendingRecords();
                resolve({ success: true, id: this.lastID, global_id: tempId });
            }
        );
    });
});

ipcMain.handle("get-transactions", async (e, accountId) => {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM transactions WHERE account_id = ? ORDER BY date DESC", [accountId], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
});

ipcMain.handle("create-transaction", async (e, data) => {
    return new Promise((resolve, reject) => {
        const { account_id, type, amount, date, description, companyId } = data;
        const tempId = randomUUID();
        db.run(
            `INSERT INTO transactions (global_id, account_id, type, amount, date, description, company_id, sync_status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)`,
            [tempId, account_id, type, amount, date, description, companyId],
            function (err) {
                if (err) return reject({ success: false, message: err.message });
                syncService.syncPendingRecords();
                resolve({ success: true, id: this.lastID, global_id: tempId });
            }
        );
    });
});

// ==========================================
// HRM MODULE - EMPLOYEES
// ==========================================

// Employees - CRUD Operations
ipcMain.handle("get-employees", async (e, companyId) => {
    const ids = await resolveCompanyIds(companyId);
    return new Promise((resolve, reject) => {
        const query = `
            SELECT *,
                   is_active as isActive,
                   first_name as firstName,
                   last_name as lastName,
                   joining_date as joiningDate,
                   hourly_rate as hourlyRate
            FROM employees 
            WHERE (company_id = ? OR company_id = ? OR company_id = ?) 
              AND (sync_status != 'deleted' OR sync_status IS NULL)
            ORDER BY id DESC
        `;
        db.all(query, [ids.localId, ids.globalId, String(ids.localId)], (err, rows) => {
            if (err) {
                console.error("Error loading employees:", err);
                return reject(err);
            }
            resolve(rows || []);
        });
    });
});

ipcMain.handle("create-employee", async (e, data) => {
    return new Promise((resolve, reject) => {
        const { firstName, lastName, phone, designation, salary, hourly_rate, joiningDate, companyId, isActive } = data;
        const tempId = randomUUID();
        const activeVal = isActive === undefined ? 1 : (isActive ? 1 : 0);

        db.run(
            `INSERT INTO employees (global_id, first_name, last_name, phone, designation, salary, hourly_rate, joining_date, company_id, sync_status, is_active, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, CURRENT_TIMESTAMP)`,
            [tempId, firstName, lastName || '', phone || '', designation, salary || 0, hourly_rate || 0, joiningDate, companyId, activeVal],
            function (err) {
                if (err) {
                    console.error("Error creating employee:", err);
                    return reject({ success: false, message: err.message });
                }
                syncService.syncPendingRecords();
                resolve({ success: true, id: this.lastID, global_id: tempId, message: "Employee created locally" });
            }
        );
    });
});

ipcMain.handle("update-employee", async (e, data) => {
    return new Promise((resolve, reject) => {
        const { id, firstName, lastName, phone, designation, salary, hourly_rate, joiningDate, isActive } = data;
        const activeVal = isActive === undefined ? 1 : (isActive ? 1 : 0);

        db.run(
            `UPDATE employees SET 
                first_name=?, last_name=?, phone=?, designation=?, salary=?, hourly_rate=?, joining_date=?, is_active=?,
                sync_status='pending', updated_at=CURRENT_TIMESTAMP 
             WHERE id=? OR global_id=?`,
            [firstName, lastName || '', phone || '', designation, salary || 0, hourly_rate || 0, joiningDate, activeVal, id, id],
            function (err) {
                if (err) {
                    console.error("Error updating employee:", err);
                    return reject({ success: false, message: err.message });
                }
                syncService.syncPendingRecords();
                resolve({ success: true, message: "Employee updated locally" });
            }
        );
    });
});

ipcMain.handle("delete-employee", async (e, id) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT global_id FROM employees WHERE id=? OR global_id=?", [id, id], (err, row) => {
            if (err || !row) return reject({ success: false, message: "Employee not found" });

            db.run(
                `UPDATE employees SET sync_status='deleted', updated_at=CURRENT_TIMESTAMP WHERE id=? OR global_id=?`,
                [id, id],
                function (err) {
                    if (err) {
                        console.error("Error deleting employee:", err);
                        return reject({ success: false, message: err.message });
                    }
                    syncService.syncPendingRecords();
                    resolve({ success: true, message: "Employee deleted locally" });
                }
            );
        });
    });
});

// ==========================================
// HRM MODULE - ATTENDANCE & SALARIES
// ==========================================
// Attendance - By Company + Date (FIXED)
ipcMain.handle("get-attendance", async (e, params) => {
    const { companyId, date } = params;
    const ids = await resolveCompanyIds(companyId);

    return new Promise((resolve, reject) => {
        const query = `
            SELECT a.*,
                   a.employee_id as employeeId,
                   a.check_in as checkIn,
                   a.check_out as checkOut,
                   e.first_name as firstName,
                   e.last_name as lastName
            FROM attendances a
            LEFT JOIN employees e ON a.employee_id = e.id OR a.employee_id = e.global_id
            WHERE (a.company_id = ? OR a.company_id = ? OR a.company_id = ?)
              AND a.date = ?
              AND (a.sync_status != 'deleted' OR a.sync_status IS NULL)
            ORDER BY e.first_name ASC
        `;

        db.all(query, [ids.localId, ids.globalId, String(ids.localId), date], (err, rows) => {
            if (err) {
                console.error("Error loading attendance:", err);
                return reject(err);
            }
            resolve(rows || []);
        });
    });
});

// Save Attendance - CRITICAL FIX: Proper employeeId matching
ipcMain.handle("save-attendance", async (e, data) => {
    return new Promise((resolve, reject) => {
        const { employeeId, status, date } = data;

        // CRITICAL: Check attendance for THIS SPECIFIC employee on THIS date
        db.get(
            "SELECT id, global_id FROM attendances WHERE (employee_id = ? OR employee_id = ?) AND date = ?",
            [employeeId, employeeId, date],
            (err, existing) => {
                if (err) {
                    console.error("Error checking attendance:", err);
                    return reject({ success: false, message: err.message });
                }

                if (existing) {
                    // Update existing record for THIS employee only
                    db.run(
                        `UPDATE attendances SET 
                            status=?, 
                            sync_status='pending', 
                            updated_at=CURRENT_TIMESTAMP 
                         WHERE id=? OR global_id=?`,
                        [status, existing.id, existing.global_id],
                        function (updateErr) {
                            if (updateErr) {
                                console.error("Error updating attendance:", updateErr);
                                return reject({ success: false, message: updateErr.message });
                            }
                            syncService.syncPendingRecords();
                            resolve({ success: true, message: "Attendance updated" });
                        }
                    );
                } else {
                    // Create new record for THIS employee
                    const tempId = randomUUID();
                    // Get companyId from employee
                    db.get("SELECT company_id FROM employees WHERE id=? OR global_id=?", [employeeId, employeeId], (empErr, emp) => {
                        const companyId = emp?.company_id;

                        db.run(
                            `INSERT INTO attendances (global_id, employee_id, date, status, company_id, sync_status, updated_at) 
                             VALUES (?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)`,
                            [tempId, employeeId, date, status, companyId],
                            function (insertErr) {
                                if (insertErr) {
                                    console.error("Error creating attendance:", insertErr);
                                    return reject({ success: false, message: insertErr.message });
                                }
                                syncService.syncPendingRecords();
                                resolve({ success: true, id: this.lastID, global_id: tempId, message: "Attendance created" });
                            }
                        );
                    });
                }
            }
        );
    });
});

ipcMain.handle("create-attendance", async (e, data) => {
    return new Promise((resolve, reject) => {
        const { employee_id, date, status, check_in, check_out, companyId } = data;
        const tempId = randomUUID();
        db.run(
            `INSERT INTO attendances (global_id, employee_id, date, status, check_in, check_out, company_id, sync_status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)`,
            [tempId, employee_id, date, status, check_in, check_out, companyId],
            function (err) {
                if (err) return reject({ success: false, message: err.message });
                syncService.syncPendingRecords();
                resolve({ success: true, id: this.lastID, global_id: tempId });
            }
        );
    });
});

ipcMain.handle("update-attendance", async (e, data) => {
    return new Promise((resolve, reject) => {
        const { id, status, check_in, check_out, companyId } = data;
        db.run(
            `UPDATE attendances SET status=?, check_in=?, check_out=?, company_id=?, sync_status='pending', updated_at=CURRENT_TIMESTAMP WHERE id=? OR global_id=?`,
            [status, check_in, check_out, companyId, id, id],
            function (err) {
                if (err) return reject({ success: false, message: err.message });
                syncService.syncPendingRecords();
                resolve({ success: true, message: "Attendance updated locally." });
            }
        );
    });
});

ipcMain.handle("delete-attendance", async (e, id) => {
    return new Promise((resolve, reject) => {
        db.run(`DELETE FROM attendances WHERE id=? OR global_id=?`, [id, id], (err) => {
            if (err) reject(err);
            else {
                // If it was already synced, we might need a status='deleted' but attendances are often small, 
                // for now just delete or mark if sync_service handles it. 
                // Many tables use status='deleted'.
                resolve({ success: true });
            }
        });
    });
});

// Salaries - For Payroll Component
ipcMain.handle("get-salaries", async (e, params) => {
    const { companyId, month } = params;
    const ids = await resolveCompanyIds(companyId);

    return new Promise((resolve, reject) => {
        const query = `
            SELECT s.*,
                   s.employee_id as employeeId,
                   s.base_salary as baseSalary,
                   s.net_salary as netSalary,
                   s.overtime_hours as overtimeHours,
                   s.overtime_pay as overtimePay,
                   e.first_name as firstName,
                   e.last_name as lastName,
                   e.designation,
                   e.hourly_rate
            FROM salary_records s
            LEFT JOIN employees e ON s.employee_id = e.id OR s.employee_id = e.global_id
            WHERE (s.company_id = ? OR s.company_id = ? OR s.company_id = ?)
              AND s.month = ?
              AND (s.sync_status != 'deleted' OR s.sync_status IS NULL)
            ORDER BY e.first_name ASC
        `;

        db.all(query, [ids.localId, ids.globalId, String(ids.localId), month], (err, rows) => {
            if (err) {
                console.error("Error loading salaries:", err);
                return reject(err);
            }

            // Transform to match frontend expectations
            const transformed = (rows || []).map(row => ({
                ...row,
                employee: {
                    id: row.employeeId,
                    firstName: row.firstName,
                    lastName: row.lastName,
                    designation: row.designation,
                    hourlyRate: row.hourly_rate
                }
            }));

            resolve(transformed);
        });
    });
});

ipcMain.handle("create-salary", async (e, data) => {
    return new Promise((resolve, reject) => {
        const { companyId, employeeId, month, baseSalary, bonus, overtimeHours, overtimePay, deductions, netSalary, notes } = data;
        const tempId = randomUUID();

        db.run(
            `INSERT INTO salary_records (
                global_id, employee_id, month, base_salary, bonus, overtime_hours, 
                overtime_pay, deductions, net_salary, notes, company_id, sync_status, updated_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)`,
            [tempId, employeeId, month, baseSalary, bonus || 0, overtimeHours || 0, overtimePay || 0, deductions || 0, netSalary, notes || '', companyId],
            function (err) {
                if (err) {
                    console.error("Error creating salary:", err);
                    return reject({ success: false, message: err.message });
                }
                syncService.syncPendingRecords();
                resolve({ success: true, id: this.lastID, global_id: tempId, message: "Salary created locally" });
            }
        );
    });
});

ipcMain.handle("get-salary-records", async (e, companyId) => {
    const ids = await resolveCompanyIds(companyId);
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM salary_records WHERE (company_id = ? OR company_id = ? OR company_id = ?) AND (sync_status != 'deleted' OR sync_status IS NULL) ORDER BY month DESC", [ids.localId, ids.globalId, String(ids.localId)], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
});

ipcMain.handle("add-salary-record", async (e, data) => {
    return new Promise((resolve, reject) => {
        const { employee_id, month, base_salary, bonus, overtime_hours, overtime_pay, deductions, net_salary, payment_date, status, companyId } = data;
        const tempId = randomUUID();
        db.run(
            `INSERT INTO salary_records (global_id, employee_id, month, base_salary, bonus, overtime_hours, overtime_pay, deductions, net_salary, payment_date, status, company_id, sync_status, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)`,
            [tempId, employee_id, month, base_salary, bonus, overtime_hours, overtime_pay, deductions, net_salary, payment_date, status, companyId],
            function (err) {
                if (err) return reject({ success: false, message: err.message });
                syncService.syncPendingRecords();
                resolve({ success: true, id: this.lastID, global_id: tempId });
            }
        );
    });
});

// Audit Logs - LOCAL FIRST
ipcMain.handle("get-audit-logs", async (e, companyId) => {
    const ids = await resolveCompanyIds(companyId);
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM audit_logs WHERE company_id = ? OR company_id = ? OR company_id = ? ORDER BY timestamp DESC", [ids.localId, ids.globalId, String(ids.localId)], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
});

// Full Reset and Sync (Deletes local sales/purchase/company/users and pulls fresh)
ipcMain.handle("reset-modules-sync", async (e, companyGlobalId) => {
    try {
        console.log(`[IPC] Resetting modules for company: ${companyGlobalId}`);
        const result = await syncService.resetModules(companyGlobalId);
        return result;
    } catch (error) {
        console.error("Reset modules sync failed:", error);
        return { success: false, message: error.message };
    }
});

// Sync Trigger (Force background sync)
ipcMain.handle("trigger-sync", async () => {
    syncService.syncPendingRecords();
    return { success: true, message: "Sync triggered in background." };
});

// Create window
function createWindow() {
    Menu.setApplicationMenu(null);
    console.log("Preload path:", path.join(__dirname, "preload.js"));
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        icon: path.join(__dirname, 'assets/icon.png'),
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false // Try disabling sandbox temporarily to rule it out
        },
    });

    if (app.isPackaged) {
        win.loadFile(path.join(__dirname, "renderer/build/index.html"));
    } else {
        win.loadURL("http://localhost:3000");
    }

    // Trigger update check after window is shown
    win.once('ready-to-show', () => {
        if (app.isPackaged) {
            autoUpdater.checkForUpdatesAndNotify();
        }
    });
}

app.whenReady().then(createWindow);
