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
    try {
        await db.asyncRun("INSERT INTO pending_sync_deletions (table_name, global_id) VALUES (?, ?)", [tableName, globalId]);
        // Trigger a full sync for deletions to be safe, or just wait for the 5-min cycle
        syncService.syncPendingRecords();
    } catch (err) {
        console.error(`[MAIN] Failed to record deletion for ${tableName}:`, err.message);
    }
}

// Global variable to track currently logged-in company for auto-sync (undefined = not logged in, null = Super Admin)
let currentLoggedCompany = undefined;
let currentLoggedRole = null;

// Setup Background Sync Timer (Every 4 minutes)
// - Pushes pending local changes to cloud
// - Pulls fresh data from cloud (if user is logged in)
setInterval(async () => {
    console.log(`\n[${new Date().toLocaleTimeString()}] [AUTO-SYNC] Starting cycle...`);

    // Always push pending changes FIRST
    // We MUST await this so it doesn't block pullAllData with its sync lock
    await syncService.syncPendingRecords();

    // If a user is logged in (including Super Admin with null company), also pull fresh data
    if (currentLoggedCompany !== undefined) {
        console.log(`[AUTO-SYNC] Pulling fresh data for session: ${currentLoggedCompany === null ? 'Global (Super Admin)' : currentLoggedCompany}`);
        try {
            await syncService.pullAllData(currentLoggedCompany);
            console.log("[AUTO-SYNC] Cycle completed successfully.");
        } catch (err) {
            console.error("[AUTO-SYNC] Data pull failed:", err.message);
        }
    } else {
        console.log("[AUTO-SYNC] No active session, skipped data pull.");
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
            const isSuperAdmin = response.user.role === 'Super Admin' || response.user.role === 'SuperAdmin' || response.user.role?.toLowerCase() === 'super_admin';
            if (isSuperAdmin) {
                companyId = null;
                console.log(`✓ Super Admin detected: Forcing null companyId.`);
            }

            // Check if user exists locally to preserve company_id (Only for non-super admins)
            const existing = await db.asyncGet("SELECT id, company_id FROM users WHERE global_id = ? OR username = ?", [response.user.id, response.user.username]);

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
                await db.asyncRun(updateQuery, updateParams);
            } else {
                await db.asyncRun(
                    `INSERT INTO users (global_id, username, password, role, role_id, fullname, company_id, sync_status, is_active) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, 'synced', 1)`,
                    [response.user.id, response.user.username, credentials.password, response.user.role, response.user.role_id, response.user.fullname, companyId]
                );
            }

            // Set global currentCompanyId for sync and other handlers
            currentLoggedRole = response.user.role;
            if (isSuperAdmin) {
                currentCompanyId = null;
                currentLoggedCompany = null; // null represents Global/SuperAdmin context in sync
                syncService.setCompanyId(null);
                // Trigger full cloud pull for Super Admin
                syncService.pullAllData(null);
            } else if (companyId) {
                currentCompanyId = companyId;
                currentLoggedCompany = companyId;
                syncService.setCompanyId(companyId);
                // Trigger pull for this company
                syncService.pullAllData(companyId);
            }
            // ATTACH PERMISSIONS
            // Prefer permissions returned by cloud if available, otherwise resolve locally
            if (response.permissions && response.permissions.length > 0) {
                console.log(`✓ Using ${response.permissions.length} permissions directly from cloud response.`);
            } else {
                const roleIdForPerms = response.user.role_id || response.user.roleId;
                const userRoleName = response.user.role;
                const cid = response.user.company_id || response.user.companyId;

                const roleLookupQuery = `
                    SELECT global_id FROM roles 
                    WHERE (id = ? OR global_id = ? OR (name = ? AND (company_id = ? OR is_system = 1)))
                    LIMIT 1
                `;

                const roleRow = await db.asyncGet(roleLookupQuery, [roleIdForPerms, roleIdForPerms, userRoleName, cid]);

                if (!roleRow) {
                    console.warn(`[LOGIN] Could not resolve roleKey for role: ${userRoleName}, ID: ${roleIdForPerms}`);
                    response.permissions = [];
                } else {
                    const localRoleId = String(roleRow.id);
                    const globalRoleId = roleRow.global_id ? String(roleRow.global_id) : null;

                    // Fetch permissions using ALL possible keys (local Id, global Id, or the input Id)
                    const searchKeys = [...new Set([localRoleId, globalRoleId, String(roleIdForPerms)].filter(Boolean))];
                    const placeholders = searchKeys.map(() => "?").join(", ");

                    const rows = await db.asyncAll(`SELECT * FROM permissions WHERE role_id IN (${placeholders})`, searchKeys);
                    const formatted = (rows || []).map(p => ({
                        id: p.global_id || p.id,
                        roleId: p.role_id,
                        module: p.module,
                        can_view: p.can_view,
                        can_create: p.can_create,
                        can_edit: p.can_edit,
                        can_delete: p.can_delete,
                        canView: p.can_view === 1 || p.can_view === true
                    }));
                    response.permissions = formatted;
                    console.log(`✓ Resolved ${formatted.length} permissions locally using keys: ${searchKeys.join(', ')}`);
                }
            }
            return response;
        } else {
            cloudError = response.message;
        }
    } catch (err) {
        cloudError = err.message;
    }

    // Offline Login Fallback (If cloud failed or rejected)
    const user = await db.asyncGet(
        "SELECT * FROM users WHERE username = ? AND password = ?",
        [credentials.username, credentials.password]
    );

    if (!user) {
        return { success: false, message: cloudError || "Invalid credentials" };
    }

    currentCompanyId = user.company_id;
    currentLoggedCompany = user.company_id;
    syncService.setCompanyId(user.company_id);
    // Trigger pull even for offline login (if internet is available)
    syncService.pullAllData(user.company_id);

    const cid = user.company_id;
    const roleRow = await db.asyncGet("SELECT id, global_id FROM roles WHERE id = ? OR global_id = ? OR (name = ? AND (company_id = ? OR is_system = 1))", [user.role_id, user.role_id, user.role, cid]);

    let permissions = [];
    if (roleRow) {
        const localRoleId = String(roleRow.id);
        const globalRoleId = roleRow.global_id ? String(roleRow.global_id) : null;
        const searchKeys = [...new Set([localRoleId, globalRoleId, String(user.role_id)].filter(Boolean))];
        const placeholders = searchKeys.map(() => "?").join(", ");
        permissions = await db.asyncAll(`SELECT * FROM permissions WHERE role_id IN (${placeholders})`, searchKeys);
    }

    const formattedPermissions = (permissions || []).map(p => ({
        id: p.global_id || p.id,
        roleId: p.role_id,
        module: p.module,
        can_view: p.can_view,
        can_create: p.can_create,
        can_edit: p.can_edit,
        can_delete: p.can_delete,
        canView: p.can_view === 1 || p.can_view === true
    }));

    return {
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
    };
});


// Companies
ipcMain.handle("get-companies", async (e, filters = {}) => {
    // Only Super Admin can see all companies
    const normalizedRole = (currentLoggedRole || '').toLowerCase().replace(/[\s_]/g, '');
    const isSuperAdmin = normalizedRole === 'superadmin' || currentLoggedCompany === null;
    if (!isSuperAdmin && currentLoggedCompany !== undefined) {
        if (currentLoggedCompany) {
            filters.id = currentLoggedCompany;
        } else {
            return [];
        }
    }

    const { search, referralType, id } = filters;

    // Improved query with Join to get Referral Company Name
    let query = `
        SELECT c.*, 
               c.is_active as isActive, 
               c.tax_no as taxNumber, 
               c.office_phone as officePhone,
               c.referral_code as referralCode,
               (SELECT name FROM companies WHERE (global_id = c.referral_code OR referral_code = c.referral_code) AND global_id != c.global_id LIMIT 1) as referralCompanyName
        FROM companies c
    `;

    let conditions = ["(c.sync_status != 'deleted' OR c.sync_status IS NULL)"];
    let params = [];

    if (id) {
        conditions.push("(c.id = ? OR c.global_id = ?)");
        params.push(id, id);
    }

    if (search) {
        conditions.push("(c.name LIKE ? OR c.email LIKE ? OR c.city LIKE ? OR c.referral_code LIKE ?)");
        params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (referralType === 'with') {
        conditions.push("c.referral_code IS NOT NULL AND c.referral_code != '' AND LOWER(c.referral_code) != 'null'");
    } else if (referralType === 'without') {
        conditions.push("(c.referral_code IS NULL OR c.referral_code = '' OR LOWER(c.referral_code) = 'null')");
    }

    if (conditions.length > 0) {
        query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY c.name ASC";

    try {
        return await db.asyncAll(query, params);
    } catch (err) {
        console.error("get-companies Error:", err.message);
        return [];
    }
});

ipcMain.handle("get-company", async (e, id) => {
    try {
        return await db.asyncGet(`SELECT *, 
                                      is_active as isActive,
                                      tax_no as taxNumber,
                                      office_phone as officePhone,
                                      referral_code as referralCode
                               FROM companies WHERE id = ? OR global_id = ?`, [id, id]);
    } catch (err) {
        console.error("get-company Error:", err.message);
        return null;
    }
});

ipcMain.handle("get-company-requests", async (e, filters) => {
    return await apiCall('get', '/company-requests', null, filters);
});

ipcMain.handle("approve-company-request", async (e, id) => {
    return await apiCall('post', `/company-requests/${id}/approve`);
});

ipcMain.handle("reject-company-request", async (e, id, notes) => {
    return await apiCall('post', `/company-requests/${id}/reject`, { notes });
});

ipcMain.handle("create-company", async (e, data) => {
    const { name, address, city, phone, officePhone, office_phone, email, taxNumber, tax_no, referral_code, referralCode } = data;
    const tempId = randomUUID();
    const officePh = officePhone || office_phone;
    const taxNo = taxNumber || tax_no;
    const refCode = referralCode || referral_code;

    try {
        const result = await db.asyncRun(
            `INSERT INTO companies (global_id, name, address, city, phone, office_phone, email, tax_no, referral_code, sync_status, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)`,
            [tempId, name, address, city, phone, officePh, email, taxNo, refCode]
        );

        const companyId = result.lastID;
        syncService.syncPendingRecords('companies', '/companies');
        return { success: true, id: companyId, global_id: tempId, message: "Company created locally." };
    } catch (err) {
        console.error("create-company Error:", err.message);
        return { success: false, message: err.message };
    }
});

ipcMain.handle("update-company", async (e, data) => {
    const { id, name, address, city, phone, officePhone, office_phone, email, taxNumber, tax_no, referralCode, referral_code, is_active } = data;
    const active = (is_active === 1 || is_active === true) ? 1 : 0;
    const officePh = officePhone || office_phone;
    const taxNo = taxNumber || tax_no;
    const refCode = referralCode || referral_code;

    try {
        await db.asyncRun(
            `UPDATE companies SET name=?, address=?, city=?, phone=?, office_phone=?, email=?, tax_no=?, referral_code=?, is_active=?, sync_status='pending', updated_at=CURRENT_TIMESTAMP 
             WHERE (id=? OR global_id=?) AND (sync_status != 'deleted' OR sync_status IS NULL)`,
            [name, address, city, phone, officePh, email, taxNo, refCode, active, id, id]
        );
        syncService.syncPendingRecords('companies', '/companies');
        return { success: true, message: "Company updated locally" };
    } catch (err) {
        console.error("update-company Error:", err.message);
        return { success: false, message: err.message };
    }
});
ipcMain.handle("delete-company", async (e, id) => {
    try {
        await db.asyncRun(`UPDATE companies SET sync_status = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE id=? OR global_id=?`, [id, id]);
        syncService.syncPendingRecords('companies', '/companies');
        return { success: true, message: "Company marked for deletion locally." };
    } catch (err) {
        console.error("delete-company Error:", err.message);
        return { success: false, message: err.message };
    }
});

// Users - LOCAL FIRST
ipcMain.handle("get-users", async (e, companyId) => {
    // If no companyId provided, only Super Admin can see all users
    const normalizedRole = (currentLoggedRole || '').toLowerCase().replace(/[\s_]/g, '');
    const isSuperAdmin = normalizedRole === 'superadmin' || currentLoggedCompany === null;

    let targetCid = companyId;
    if (!targetCid && !isSuperAdmin) {
        targetCid = currentLoggedCompany;
    }

    const ids = targetCid ? await resolveCompanyIds(targetCid) : { localId: null, globalId: null };

    try {
        if (!targetCid) {
            // Super Admin global view
            return await db.asyncAll("SELECT *, is_active as isActive, fullname as fullName, role_id as roleId, company_id as companyId FROM users WHERE sync_status != 'deleted' OR sync_status IS NULL");
        }
        return await db.asyncAll("SELECT *, is_active as isActive, fullname as fullName, role_id as roleId, company_id as companyId FROM users WHERE (company_id = ? OR company_id = ? OR company_id = ?) AND (sync_status != 'deleted' OR sync_status IS NULL)", [ids.localId, ids.globalId, String(ids.localId)]);
    } catch (err) {
        console.error("get-users Error:", err.message);
        return [];
    }
});

// Roles & Permissions - LOCAL FIRST
ipcMain.handle("get-roles", async (e, companyId) => {
    const normalizedRole = (currentLoggedRole || '').toLowerCase().replace(/[\s_]/g, '');
    const isSuperAdmin = normalizedRole === 'superadmin' || currentLoggedCompany === null;
    const ids = await resolveCompanyIds(companyId);

    let query = `
        SELECT r.*, 
               r.is_active as isActive, 
               r.is_system as isSystem,
               (SELECT COUNT(*) FROM permissions WHERE (role_id = r.global_id OR role_id = CAST(r.id AS TEXT)) AND can_view = 1) as moduleCount
        FROM roles r 
    `;

    let conditions = ["(r.sync_status != 'deleted' OR r.sync_status IS NULL)"];
    let params = [];

    if (isSuperAdmin && !companyId) {
        // Super Admin viewing globally: show ONLY system-wide templates
        conditions.push("(r.is_system = 1 AND (r.company_id IS NULL OR r.company_id = ''))");
    } else {
        // Regular company or Super Admin filtering by company
        conditions.push("(r.company_id = ? OR r.company_id = ? OR r.company_id = ?)");
        params.push(ids.localId, ids.globalId, String(ids.localId));
    }

    query += " WHERE " + conditions.join(" AND ");
    query += " ORDER BY r.is_system DESC, r.name ASC";

    try {
        return await db.asyncAll(query, params);
    } catch (err) {
        console.error("get-roles Error:", err.message);
        return [];
    }
});


ipcMain.handle("get-permissions", async (e, roleId) => {
    try {
        const row = await db.asyncGet("SELECT id, global_id FROM roles WHERE id = ? OR global_id = ?", [roleId, roleId]);
        const localId = row ? String(row.id) : null;
        const globalId = (row && row.global_id) ? String(row.global_id) : null;

        const params = [...new Set([globalId, localId, String(roleId)].filter(Boolean))];
        if (params.length === 0) return [];

        const placeholders = params.map(() => "?").join(", ");
        const query = `
            SELECT id, global_id, module, can_view, can_create, can_edit, can_delete, sync_status
            FROM permissions 
            WHERE role_id IN (${placeholders})
            ORDER BY CASE WHEN sync_status = 'pending' THEN 0 ELSE 1 END ASC, id DESC
        `;

        const rows = await db.asyncAll(query, params);
        const seen = new Set();
        return (rows || []).filter(r => {
            if (seen.has(r.module)) return false;
            seen.add(r.module);
            return true;
        }).map(r => ({
            id: r.id,
            global_id: r.global_id,
            module: r.module,
            can_view: r.can_view === 1 ? 1 : 0,
            can_create: r.can_create === 1 ? 1 : 0,
            can_edit: r.can_edit === 1 ? 1 : 0,
            can_delete: r.can_delete === 1 ? 1 : 0,
        }));
    } catch (err) {
        console.error("get-permissions Error:", err.message);
        return [];
    }
});

ipcMain.handle("create-permission", async (e, data) => {
    const { role_id, module, can_view, can_create, can_edit, can_delete } = data;
    const tempId = randomUUID();
    const v = (can_view === true || can_view == 1) ? 1 : 0;
    const c = (can_create === true || can_create == 1) ? 1 : 0;
    const ex = (can_edit === true || can_edit == 1) ? 1 : 0;
    const d = (can_delete === true || can_delete == 1) ? 1 : 0;

    try {
        const result = await db.asyncRun(
            `INSERT INTO permissions (global_id, role_id, module, can_view, can_create, can_edit, can_delete, sync_status, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)`,
            [tempId, role_id, module, v, c, ex, d]
        );
        // Mark the parent role as pending to trigger sync
        await db.asyncRun("UPDATE roles SET sync_status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE id = ? OR global_id = ?", [role_id, role_id]);
        syncService.syncPendingRecords('roles', '/roles');
        return { success: true, id: result.lastID, global_id: tempId };
    } catch (err) {
        console.error("create-permission Error:", err.message);
        return { success: false, message: err.message };
    }
});

ipcMain.handle("update-permission", async (e, data) => {
    try {
        const { id, can_view, can_create, can_edit, can_delete } = data;
        const v = (can_view === true || can_view == 1) ? 1 : 0;
        const c = (can_create === true || can_create == 1) ? 1 : 0;
        const ex = (can_edit === true || can_edit == 1) ? 1 : 0;
        const d = (can_delete === true || can_delete == 1) ? 1 : 0;

        await db.asyncRun(
            `UPDATE permissions SET can_view=?, can_create=?, can_edit=?, can_delete=?, sync_status='pending', updated_at=CURRENT_TIMESTAMP 
             WHERE id=? OR global_id=?`,
            [v, c, ex, d, id, id]
        );
        // Mark the parent role as pending to trigger sync
        const permRow = await db.asyncGet("SELECT role_id FROM permissions WHERE id = ? OR global_id = ?", [id, id]);
        if (permRow) {
            await db.asyncRun("UPDATE roles SET sync_status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE id = ? OR global_id = ?", [permRow.role_id, permRow.role_id]);
        }
        syncService.syncPendingRecords('roles', '/roles');
        return { success: true };
    } catch (err) {
        console.error("update-permission Error:", err.message);
        return { success: false, message: err.message };
    }
});

// Users Management Handlers (Missing previously)
ipcMain.handle("create-user", async (e, data) => {
    try {
        const { username, password, role, fullname, company_id, companyId, role_id, roleId } = data;
        let cid = company_id || companyId || currentCompanyId;
        let rid = role_id || roleId;
        let finalRoleName = role;
        const tempId = randomUUID();

        // If Super Admin is creating user, resolve the role properly
        const normalizedRole = (currentLoggedRole || '').toLowerCase().replace(/[\s_]/g, '');
        const isSuperAdmin = normalizedRole === 'superadmin' || currentLoggedCompany === null;
        if (isSuperAdmin && cid) {
            // First: Try to get role name from system template if rid points to a system role
            if (rid) {
                const systemRole = await db.asyncGet("SELECT name FROM roles WHERE (id = ? OR global_id = ?) AND is_system = 1", [rid, rid]);
                if (systemRole) {
                    finalRoleName = systemRole.name;
                    console.log(`[CREATE-USER] Resolved system template role name: ${finalRoleName}`);
                }
            }

            // Second: Try to find a company-specific role with the same name
            if (finalRoleName) {
                const companyRole = await db.asyncGet(
                    "SELECT id, global_id, name FROM roles WHERE company_id = ? AND LOWER(name) = LOWER(?)",
                    [cid, finalRoleName]
                );
                if (companyRole) {
                    rid = companyRole.global_id || String(companyRole.id);
                    console.log(`[AUTO-LINK] Found company-specific role: ${rid} (${companyRole.name})`);
                } else {
                    // No company-specific role exists. Still use the system template rid.
                    // The cloud API will resolve by role name.
                    console.log(`[CREATE-USER] No company-specific '${finalRoleName}' role found for company ${cid}. Using system template ID: ${rid}`);
                }
            }
        }

        const result = await db.asyncRun(
            `INSERT INTO users (global_id, username, password, role, role_id, fullname, company_id, sync_status, is_active, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 1, CURRENT_TIMESTAMP)`,
            [tempId, username, password, finalRoleName, rid, fullname, cid]
        );
        syncService.syncPendingRecords('users', '/users');
        return { success: true, id: result.lastID, global_id: tempId, message: "User created locally" };
    } catch (err) {
        console.error("create-user Error:", err.message);
        return { success: false, message: err.message };
    }
});

ipcMain.handle("update-user", async (e, data) => {
    try {
        const { id, username, password, role, fullname, fullName, role_id, roleId, is_active } = data;
        let rid = role_id || roleId;
        const finalFullName = fullname || fullName;
        let finalRoleName = role;

        // Resolve existing data
        const userRow = await db.asyncGet("SELECT * FROM users WHERE id = ? OR global_id = ?", [id, id]);
        if (!userRow) return { success: false, message: "User not found" };

        const active = (is_active !== undefined) ? ((is_active === 1 || is_active === true) ? 1 : 0) : userRow.is_active;
        const cid = userRow.company_id;

        const normalizedRole = (currentLoggedRole || '').toLowerCase().replace(/[\s_]/g, '');
        const isSuperAdmin = normalizedRole === 'superadmin' || currentLoggedCompany === null;
        if (isSuperAdmin && cid) {
            // Resolve role mapping for companies
            if (!rid && finalRoleName) {
                const companyRole = await db.asyncGet(
                    "SELECT id, global_id FROM roles WHERE (company_id = ? OR company_id IS NULL) AND LOWER(name) = LOWER(?)",
                    [cid, finalRoleName]
                );
                if (companyRole) rid = companyRole.global_id || String(companyRole.id);
            }
        }

        let query = "UPDATE users SET username=?, role=?, role_id=?, fullname=?, is_active=?, sync_status='pending', updated_at=CURRENT_TIMESTAMP";
        let params = [username || userRow.username, finalRoleName || userRow.role, rid || userRow.role_id, finalFullName || userRow.fullname, active];

        if (password && password.trim() !== '') {
            query += ", password=?";
            params.push(password);
        }

        query += " WHERE id=? OR global_id=?";
        params.push(id, id);

        await db.asyncRun(query, params);

        // Push record to cloud
        syncService.syncPendingRecords('users', '/users');

        return { success: true, message: "User updated successfully" };
    } catch (err) {
        console.error("update-user Error:", err.message);
        return { success: false, message: err.message };
    }
});

ipcMain.handle("delete-user", async (e, id) => {
    try {
        const row = await db.asyncGet("SELECT global_id FROM users WHERE id=? OR global_id=?", [id, id]);
        if (!row) return { success: false, message: "User not found" };
        const gid = row.global_id;

        // Prevent deleting the currently logged in user (basic safety)
        // Note: In a real app, you'd check against the session

        await db.asyncRun("UPDATE users SET sync_status = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE global_id = ?", [gid]);

        // Trigger sync in background
        syncService.syncPendingRecords('users', '/users');

        return { success: true, message: "User marked for deletion locally." };
    } catch (err) {
        console.error("delete-user Error:", err.message);
        return { success: false, message: "User delete failed: " + err.message };
    }
});

// Roles Management Handlers

// Helper: Resolve both local and global IDs for a company
async function resolveCompanyIds(cid) {
    if (!cid || cid === 'null' || cid === 'undefined') {
        return { localId: null, globalId: null, anyId: null };
    }

    try {
        const row = await db.asyncGet("SELECT id, global_id FROM companies WHERE id = ? OR global_id = ?", [cid, cid]);
        if (row) {
            return {
                localId: row.id,
                globalId: row.global_id,
                anyId: row.global_id || row.id
            };
        } else {
            // Fallback
            if (!isNaN(cid) && String(cid).length < 10) {
                return { localId: parseInt(cid), globalId: null, anyId: cid };
            } else {
                return { localId: null, globalId: cid, anyId: cid };
            }
        }
    } catch (err) {
        console.error("resolveCompanyIds Error:", err.message);
        return { localId: null, globalId: null, anyId: cid };
    }
}

ipcMain.handle("create-role", async (e, data) => {
    const { name, description, permissions, companyId, company_id } = data;
    let cid = companyId || company_id || currentCompanyId;
    const tempId = randomUUID(); // Generate temp ID for local linking

    try {
        await db.asyncRun("BEGIN TRANSACTION");

        // 1. Insert Role
        const isSystem = (!cid || cid === 'null' || cid === 'undefined') ? 1 : 0;
        const result = await db.asyncRun(
            `INSERT INTO roles (global_id, name, description, company_id, sync_status, is_system, updated_at) 
             VALUES (?, ?, ?, ?, 'pending', ?, CURRENT_TIMESTAMP)`,
            [tempId, name, description, cid, isSystem]
        );

        const roleId = result.lastID;

        // 2. Insert ALL Permissions
        if (permissions && permissions.length > 0) {
            for (const p of permissions) {
                const pId = randomUUID();
                const v = (p.can_view == 1 || p.canView == 1 || p.can_view === true || p.canView === true) ? 1 : 0;
                const c = (p.can_create == 1 || p.canCreate == 1 || p.can_create === true || p.canCreate === true) ? 1 : 0;
                const ex = (p.can_edit == 1 || p.canEdit == 1 || p.can_edit === true || p.canEdit === true) ? 1 : 0;
                const d = (p.can_delete == 1 || p.canDelete == 1 || p.can_delete === true || p.canDelete === true) ? 1 : 0;

                await db.asyncRun(
                    `INSERT OR REPLACE INTO permissions (role_id, module, can_view, can_create, can_edit, can_delete, sync_status, updated_at, global_id) 
                     VALUES (?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP, ?)`,
                    [tempId, p.module, v, c, ex, d, pId]
                );
            }
            console.log(`[ROLE CREATE] Saved ${permissions.length} permission rows for role '${name}'`);
        }

        await db.asyncRun("COMMIT");
        syncService.syncPendingRecords('roles', '/roles');
        return { success: true, id: roleId, global_id: tempId, message: "Role created successfully" };
    } catch (err) {
        await db.asyncRun("ROLLBACK").catch(() => { });
        console.error("create-role Error:", err.message);
        return { success: false, message: err.message };
    }
});

ipcMain.handle("update-role", async (e, data) => {
    try {
        const { id, global_id, name, description, permissions } = data;

        const roleRow = await db.asyncGet("SELECT id, global_id FROM roles WHERE id = ? OR global_id = ?", [id, global_id || id]);
        if (!roleRow) return { success: false, message: "Role not found" };

        const localId = roleRow.id;
        const roleKey = roleRow.global_id || String(id);

        await db.asyncRun("BEGIN TRANSACTION");

        // 1. Update Role metadata
        await db.asyncRun(
            "UPDATE roles SET name = ?, description = ?, sync_status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            [name, description, localId]
        );

        // 2. Delete ALL existing permissions
        await db.asyncRun("DELETE FROM permissions WHERE role_id = ? OR role_id = ?", [String(roleKey), String(localId)]);

        // 3. Re-insert the full permission matrix
        if (permissions && Array.isArray(permissions)) {
            for (const p of permissions) {
                const pId = p.global_id || p.id || randomUUID();
                const v = (p.can_view == 1 || p.canView == 1 || p.can_view === true || p.canView === true) ? 1 : 0;
                const c = (p.can_create == 1 || p.canCreate == 1 || p.can_create === true || p.canCreate === true) ? 1 : 0;
                const ex = (p.can_edit == 1 || p.canEdit == 1 || p.can_edit === true || p.canEdit === true) ? 1 : 0;
                const d = (p.can_delete == 1 || p.canDelete == 1 || p.can_delete === true || p.canDelete === true) ? 1 : 0;

                await db.asyncRun(
                    `INSERT OR REPLACE INTO permissions (role_id, module, can_view, can_create, can_edit, can_delete, sync_status, updated_at, global_id) 
                     VALUES (?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP, ?)`,
                    [roleKey, p.module, v, c, ex, d, pId]
                );
            }
            console.log(`[ACL UPDATE] Refreshed ${permissions.length} modules for role: ${name}`);
        }

        await db.asyncRun("COMMIT");
        syncService.syncPendingRecords('roles', '/roles');
        return { success: true, message: "Role & Permissions updated successfully" };
    } catch (err) {
        await db.asyncRun("ROLLBACK").catch(() => { });
        console.error("update-role Error:", err.message);
        return { success: false, message: err.message };
    }
});

ipcMain.handle("delete-role", async (e, id) => {
    try {
        const row = await db.asyncGet("SELECT id, global_id, is_system FROM roles WHERE id = ? OR global_id = ?", [id, id]);
        if (!row) return { success: false, message: "Role not found" };

        if (row.is_system) {
            return { success: false, message: "System roles cannot be deleted." };
        }

        const gid = row.global_id;
        const localId = row.id;

        // Check for users assigned to this role
        const usersCount = await db.asyncGet("SELECT COUNT(*) as count FROM users WHERE role_id = ? OR role_id = ?", [gid, localId]);
        if (usersCount && usersCount.count > 0) {
            return { success: false, message: "Is role ko delete nahi kiya ja sakta kyunke users ko ye role assign kiya gaya hai." };
        }

        await db.asyncRun("BEGIN TRANSACTION");
        try {
            // Mark role as deleted
            await db.asyncRun("UPDATE roles SET sync_status = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE global_id = ?", [gid]);
            // Delete associated permissions
            await db.asyncRun("DELETE FROM permissions WHERE role_id = ? OR role_id = ?", [String(gid), String(localId)]);
            await db.asyncRun("COMMIT");
        } catch (trxErr) {
            await db.asyncRun("ROLLBACK");
            throw trxErr;
        }

        syncService.syncPendingRecords('roles', '/roles');
        return { success: true, message: "Role deleted locally." };
    } catch (err) {
        console.error("delete-role Error:", err.message);
        return { success: false, message: "Role delete failed: " + err.message };
    }
});



// Products - LOCAL FIRST (Full Join for Details)
ipcMain.handle("get-products", async (e, companyId) => {
    try {
        const ids = await resolveCompanyIds(companyId);
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
        const rows = await db.asyncAll(query, [ids.localId, ids.globalId, String(ids.localId)]);
        return rows.map(row => ({
            ...row,
            costPrice: row.costPrice || 0,
            sellPrice: row.sellPrice || 0,
            category: row.category_id ? { id: row.category_id, name: row.category_name } : null,
            brand: row.brand_id ? { id: row.brand_id, name: row.brand_name } : null,
            vendor: row.vendor_id ? { id: row.vendor_id, name: row.vendor_name } : null
        }));
    } catch (err) {
        console.error("get-products Error:", err.message);
        return [];
    }
});

ipcMain.handle("create-product", async (e, data) => {
    try {
        const { name, cost_price, sell_price, stock_qty, stock_quantity, alert_qty, alert_threshold, category_id, vendor_id, brand_id, unit, weight, expiry_date, description, companyId, company_id, color, size, grade, condition } = data;
        const code = data.sku || data.code; // Robust mapping for SKU
        const finalCompanyId = companyId || company_id;

        const result = await db.asyncRun(
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
            ]
        );

        syncService.syncPendingRecords('products', '/products');
        return { success: true, id: result.lastID, message: "Product saved locally and syncing..." };
    } catch (err) {
        console.error("create-product Error:", err.message);
        return { success: false, message: err.message };
    }
});

ipcMain.handle("update-product", async (e, data) => {
    try {
        const { id, name, cost_price, sell_price, stock_qty, alert_qty, category_id, vendor_id, brand_id, unit, weight, expiry_date, description, companyId, company_id, color, size, grade, condition } = data;
        const code = data.sku || data.code; // Robust mapping for SKU

        await db.asyncRun(
            `UPDATE products SET name=?, code=?, cost_price=?, sell_price=?, stock_quantity=?, alert_threshold=?, category_id=?, vendor_id=?, brand_id=?, unit=?, weight=?, expiry_date=?, description=?, company_id=?, color=?, size=?, grade=?, condition=?, sync_status='pending', updated_at=CURRENT_TIMESTAMP WHERE id=? OR global_id=?`,
            [name, code, cost_price, sell_price, stock_qty, alert_qty, category_id, vendor_id, brand_id, unit, weight, expiry_date, description, companyId || company_id, color, size, grade, condition, id, id]
        );

        syncService.syncPendingRecords('products', '/products');
        return { success: true, message: "Product updated locally and syncing..." };
    } catch (err) {
        console.error("update-product Error:", err.message);
        return { success: false, message: err.message };
    }
});

ipcMain.handle("delete-product", async (e, id) => {
    try {
        const row = await db.asyncGet("SELECT global_id FROM products WHERE id=? OR global_id=?", [id, id]);
        if (!row) return { success: false, message: "Product not found" };
        const gid = row.global_id;

        const checkQuery = `
            SELECT 
                (SELECT COUNT(*) FROM sale_items WHERE (product_id = ? OR product_id = ?) AND sync_status != 'deleted') +
                (SELECT COUNT(*) FROM purchase_items WHERE (product_id = ? OR product_id = ?) AND sync_status != 'deleted') as linkedCount
        `;
        const countRow = await db.asyncGet(checkQuery, [id, gid, id, gid]);

        if (countRow && countRow.linkedCount > 0) {
            return {
                success: false,
                message: "Ye product delete nahi hosakta kyunki iska Sales ya Purchase record maujood hai. Aap isay Deactivate kar saktay hain."
            };
        }

        await db.asyncRun(`UPDATE products SET sync_status = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE global_id=?`, [gid]);

        syncService.syncPendingRecords('products', '/products');
        return { success: true, message: "Product deleted locally." };
    } catch (err) {
        console.error("delete-product Error:", err.message);
        return { success: false, message: "Product delete failed: " + err.message };
    }
});

// Sales - LOCAL FIRST
ipcMain.handle("get-sales", async (e, companyId) => {
    try {
        const ids = await resolveCompanyIds(companyId);
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
        const rows = await db.asyncAll(query, [ids.localId, ids.globalId, String(ids.localId)]);

        const salesWithItems = [];
        for (const row of rows) {
            const items = await db.asyncAll(`
                SELECT si.*, 
                       si.unit_price as price, 
                       si.total_price as total,
                       p.name, p.code as sku, p.sell_price as sellPrice 
                FROM sale_items si
                LEFT JOIN products p ON si.product_id = p.id OR si.product_id = p.global_id
                WHERE si.sale_id = ? OR si.sale_id = ?
            `, [row.global_id, String(row.id)]);

            salesWithItems.push({
                ...row,
                tax: row.tax_amount || 0,
                shippingCost: row.shipping_cost || 0,
                customer: row.customerName ? { name: row.customerName } : null,
                user: row.userName ? { fullname: row.userName } : null,
                items: (items || []).map(item => ({
                    ...item,
                    productId: item.product_id,
                    price: item.unit_price,
                    total: item.total_price,
                    product: { id: item.product_id, name: item.name, sku: item.sku }
                }))
            });
        }
        return salesWithItems;
    } catch (err) {
        console.error("get-sales Error:", err.message);
        return [];
    }
});

ipcMain.handle("add-sale", async (e, data) => {
    try {
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

        await db.asyncRun("BEGIN TRANSACTION");

        const result = await db.asyncRun(
            `INSERT INTO sales (global_id, customer_id, user_id, inv_number, total_amount, discount, grand_total, amount_paid, payment_method, payment_status, notes, tax_amount, shipping_cost, company_id, sync_status, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)`,
            [tempId, customer_id, user_id, invoice_no, total_amount, discount, grand_total, amount_paid, payment_method, payment_status, notes, tax_amount, shipping_cost, finalCompanyId]
        );

        const saleId = result.lastID;

        // 1. Add items and Update Stock
        if (items && Array.isArray(items)) {
            for (const item of items) {
                const pid = item.productId || item.product_id;
                const qty = item.quantity || 0;
                await db.asyncRun(
                    `INSERT INTO sale_items (global_id, sale_id, product_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?, ?)`,
                    [randomUUID(), tempId, pid, qty, item.price || item.unit_price, item.total || item.total_price || (qty * (item.price || item.unit_price))]
                );
                await db.asyncRun(`UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ? OR global_id = ?`, [qty, pid, pid]);
            }
        }

        // 2. Update Customer Balance
        if (customer_id) {
            const balanceChange = grand_total - amount_paid;
            await db.asyncRun(`UPDATE customers SET current_balance = current_balance + ? WHERE id = ? OR global_id = ?`, [balanceChange, customer_id, customer_id]);
        }

        await db.asyncRun("COMMIT");
        syncService.syncPendingRecords('sales', '/sales');
        return { success: true, id: saleId, global_id: tempId, message: "Sale recorded and stock/balance updated." };
    } catch (err) {
        await db.asyncRun("ROLLBACK").catch(() => { });
        console.error("add-sale Error:", err.message);
        return { success: false, message: err.message };
    }
});

ipcMain.handle("update-sale", async (e, data) => {
    try {
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

        const oldSale = await db.asyncGet("SELECT * FROM sales WHERE id=? OR global_id=?", [id, id]);
        if (!oldSale) return { success: false, message: "Old sale not found" };

        const oldGid = oldSale.global_id;
        const oldItems = await db.asyncAll("SELECT * FROM sale_items WHERE sale_id=?", [oldGid]);

        await db.asyncRun("BEGIN TRANSACTION");

        // 1. Reverse Old Stock
        if (oldItems && Array.isArray(oldItems)) {
            for (const item of oldItems) {
                await db.asyncRun("UPDATE products SET stock_quantity = stock_quantity + ? WHERE id=? OR global_id=?", [item.quantity, item.product_id, item.product_id]);
            }
        }

        // 2. Reverse Old Customer Balance
        if (oldSale.customer_id) {
            const oldDiff = oldSale.grand_total - oldSale.amount_paid;
            await db.asyncRun("UPDATE customers SET current_balance = current_balance - ? WHERE id=? OR global_id=?", [oldDiff, oldSale.customer_id, oldSale.customer_id]);
        }

        // 3. Update Sale Record
        await db.asyncRun(
            `UPDATE sales SET customer_id=?, inv_number=?, total_amount=?, discount=?, grand_total=?, amount_paid=?, payment_method=?, payment_status=?, notes=?, tax_amount=?, shipping_cost=?, sync_status='pending', updated_at=CURRENT_TIMESTAMP WHERE id=? OR global_id=?`,
            [customer_id, inv_number, total_amount, discount, grand_total, amount_paid, payment_method, payment_status, notes, tax_amount, shipping_cost, id, id]
        );

        // 4. Delete and Re-insert items, Update New Stock
        await db.asyncRun("DELETE FROM sale_items WHERE sale_id = ?", [oldGid]);

        if (items && Array.isArray(items)) {
            for (const item of items) {
                const pid = item.productId || item.product_id;
                const qty = item.quantity || 0;
                await db.asyncRun(
                    `INSERT INTO sale_items (global_id, sale_id, product_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?, ?)`,
                    [randomUUID(), oldGid, pid, qty, item.price || item.unit_price, item.total || item.total_price]
                );
                await db.asyncRun(`UPDATE products SET stock_quantity = stock_quantity - ? WHERE id=? OR global_id=?`, [qty, pid, pid]);
            }
        }

        // 5. Apply New Customer Balance
        if (customer_id) {
            const newDiff = grand_total - amount_paid;
            await db.asyncRun("UPDATE customers SET current_balance = current_balance + ? WHERE id=? OR global_id=?", [newDiff, customer_id, customer_id]);
        }

        await db.asyncRun("COMMIT");
        syncService.syncPendingRecords('sales', '/sales');
        return { success: true, message: "Sale updated and stock/balance adjusted." };
    } catch (err) {
        await db.asyncRun("ROLLBACK").catch(() => { });
        console.error("update-sale Error:", err.message);
        return { success: false, message: err.message };
    }
});

ipcMain.handle("delete-sale", async (e, id) => {
    try {
        const sale = await db.asyncGet("SELECT * FROM sales WHERE id = ? OR global_id = ?", [id, id]);
        if (!sale) return { success: false, message: "Sale not found" };
        const gid = sale.global_id;

        const items = await db.asyncAll("SELECT * FROM sale_items WHERE sale_id = ?", [gid]);

        await db.asyncRun("BEGIN TRANSACTION");

        // 1. Restore Stock
        if (items && Array.isArray(items)) {
            for (const item of items) {
                await db.asyncRun("UPDATE products SET stock_quantity = stock_quantity + ? WHERE id=? OR global_id=?", [item.quantity, item.product_id, item.product_id]);
            }
        }

        // 2. Adjust Customer Balance
        if (sale.customer_id) {
            const diff = sale.grand_total - sale.amount_paid;
            await db.asyncRun("UPDATE customers SET current_balance = current_balance - ? WHERE id=? OR global_id=?", [diff, sale.customer_id, sale.customer_id]);
        }

        // 3. Mark Sale as Deleted
        await db.asyncRun("UPDATE sales SET sync_status = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE global_id = ?", [gid]);

        await db.asyncRun("COMMIT");
        syncService.syncPendingRecords('sales', '/sales');
        return { success: true, message: "Sale deleted and stock/balance restored." };
    } catch (err) {
        await db.asyncRun("ROLLBACK").catch(() => { });
        console.error("delete-sale Error:", err.message);
        return { success: false, message: err.message };
    }
});

// Customers - LOCAL FIRST
ipcMain.handle("get-customers", async (e, companyId) => {
    try {
        const ids = await resolveCompanyIds(companyId);
        const rows = await db.asyncAll(
            `SELECT *, 
                   is_active as isActive, 
                   current_balance as balance,
                   credit_limit as creditLimit,
                   opening_balance as openingBalance,
                   gst_no as gstNo,
                   customer_type as customerType
            FROM customers 
            WHERE (company_id = ? OR company_id = ? OR company_id = ?) 
              AND (sync_status != 'deleted' OR sync_status IS NULL) 
            ORDER BY name ASC`,
            [ids.localId, ids.globalId, String(ids.localId)]
        );
        return rows;
    } catch (err) {
        console.error("get-customers Error:", err.message);
        return [];
    }
});

ipcMain.handle("create-customer", async (e, data) => {
    try {
        const { name, phone, email, address, city, cnic, gst_no, creditLimit, openingBalance, customer_type, customerType, companyId, company_id } = data;
        const finalCompanyId = companyId || company_id;

        if (phone) {
            const existing = await db.asyncGet("SELECT id FROM customers WHERE phone = ? AND (company_id = ? OR company_id = ?) AND sync_status != 'deleted'", [phone, finalCompanyId, String(finalCompanyId)]);
            if (existing) return { success: false, message: "Is phone number ke saath customer pehle se maujood hai." };
        }

        const cType = customer_type || customerType || 'retail';
        const opBal = parseFloat(openingBalance || 0);
        const credLim = parseFloat(creditLimit || 0);
        const tempId = randomUUID();

        const result = await db.asyncRun(
            `INSERT INTO customers (
                global_id, name, phone, email, address, city, cnic, gst_no, 
                customer_type, credit_limit, opening_balance, current_balance, 
                company_id, sync_status, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)`,
            [tempId, name, phone, email, address, city, cnic, gst_no, cType, credLim, opBal, opBal, finalCompanyId]
        );

        syncService.syncPendingRecords('customers', '/customers');
        return { success: true, id: result.lastID, global_id: tempId, message: "Customer saved locally." };
    } catch (err) {
        console.error("create-customer Error:", err.message);
        return { success: false, message: err.message };
    }
});

ipcMain.handle("update-customer", async (e, data) => {
    try {
        const { id, name, phone, email, address, city, cnic, gst_no, creditLimit, openingBalance, balance, customer_type, customerType, companyId, company_id } = data;
        const cType = customer_type || customerType || 'retail';

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

        if (companyId || company_id) {
            updates.push("company_id=?");
            params.push(companyId || company_id);
        }

        const query = `UPDATE customers SET ${updates.join(", ")} WHERE id=? OR global_id=?`;
        params.push(id, id);

        await db.asyncRun(query, params);
        syncService.syncPendingRecords('customers', '/customers');
        return { success: true, message: "Customer updated locally." };
    } catch (err) {
        console.error("update-customer Error:", err.message);
        return { success: false, message: err.message };
    }
});

ipcMain.handle("delete-customer", async (e, id) => {
    try {
        const row = await db.asyncGet("SELECT global_id FROM customers WHERE id=? OR global_id=?", [id, id]);
        if (!row) return { success: false, message: "Customer not found" };
        const gid = row.global_id;

        // Check if any sale is using this customer
        const countRow = await db.asyncGet("SELECT COUNT(*) as count FROM sales WHERE (customer_id = ? OR customer_id = ?) AND sync_status != 'deleted'", [id, gid]);

        if (countRow && countRow.count > 0) {
            return { success: false, message: "Is Customer ko delete nahi kiya ja sakta kyunke iske sales records maujood hain. Aap isay Deactivate kar saktay hain." };
        }

        await db.asyncRun(`UPDATE customers SET sync_status = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE global_id=?`, [gid]);

        syncService.syncPendingRecords('customers', '/customers');
        return { success: true, message: "Customer marked for deletion locally." };
    } catch (err) {
        console.error("delete-customer Error:", err.message);
        return { success: false, message: "Customer delete failed: " + err.message };
    }
});

// Vendors (Suppliers) - LOCAL FIRST
ipcMain.handle("get-vendors", async (e, companyId) => {
    try {
        const ids = await resolveCompanyIds(companyId);
        const rows = await db.asyncAll(`SELECT *, 
                       is_active as isActive, 
                       current_balance as balance,
                       opening_balance as openingBalance,
                       company_name as companyName,
                       contact_person as contactPerson,
                       gst_no as gstNo
                FROM vendors 
                WHERE (company_id = ? OR company_id = ? OR company_id = ?) 
                  AND (sync_status != 'deleted' OR sync_status IS NULL) 
                ORDER BY name ASC`, [ids.localId, ids.globalId, String(ids.localId)]);
        return rows;
    } catch (err) {
        console.error("get-vendors Error:", err.message);
        return [];
    }
});

ipcMain.handle("create-vendor", async (e, data) => {
    try {
        const { name, contact_person, contactPerson, phone, email, address, city, gst_no, gstNo, company_name, companyName, openingBalance, companyId, company_id } = data;
        const finalCompanyId = companyId || company_id;

        if (phone) {
            const existing = await db.asyncGet("SELECT id FROM vendors WHERE phone = ? AND (company_id = ? OR company_id = ?) AND sync_status != 'deleted'", [phone, finalCompanyId, String(finalCompanyId)]);
            if (existing) return { success: false, message: "Is phone number ke saath vendor pehle se maujood hai." };
        }

        const opBal = parseFloat(openingBalance || 0);
        const cPerson = contact_person || contactPerson || "";
        const cName = company_name || companyName || "";
        const gNo = gst_no || gstNo || "";

        const tempId = randomUUID();
        const result = await db.asyncRun(
            `INSERT INTO vendors (
                global_id, name, contact_person, phone, email, address, city, gst_no, company_name, 
                opening_balance, current_balance, company_id, sync_status, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)`,
            [tempId, name, cPerson, phone, email, address, city, gNo, cName, opBal, opBal, finalCompanyId]
        );

        syncService.syncPendingRecords('vendors', '/vendors');
        return { success: true, id: result.lastID, global_id: tempId, message: "Vendor saved locally." };
    } catch (err) {
        console.error("create-vendor Error:", err.message);
        return { success: false, message: err.message };
    }
});

ipcMain.handle("update-vendor", async (e, data) => {
    try {
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

        await db.asyncRun(query, params);
        syncService.syncPendingRecords('vendors', '/vendors');
        return { success: true, message: "Vendor updated locally." };
    } catch (err) {
        console.error("update-vendor Error:", err.message);
        return { success: false, message: err.message };
    }
});

ipcMain.handle("delete-vendor", async (e, id) => {
    try {
        const row = await db.asyncGet("SELECT global_id FROM vendors WHERE id=? OR global_id=?", [id, id]);
        if (!row) return { success: false, message: "Vendor not found" };
        const gid = row.global_id;

        const checkQuery = `
            SELECT 
                (SELECT COUNT(*) FROM purchases WHERE (vendor_id = ? OR vendor_id = ?) AND sync_status != 'deleted') +
                (SELECT COUNT(*) FROM products WHERE (vendor_id = ? OR vendor_id = ?) AND sync_status != 'deleted') as linkedCount
        `;
        const countRow = await db.asyncGet(checkQuery, [id, gid, id, gid]);

        if (countRow && countRow.linkedCount > 0) {
            console.warn(`[DELETE-VENDOR] Blocked: Vendor ${id}/${gid} has ${countRow.linkedCount} linked records.`);
            return { success: false, message: "Is Vendor ko delete nahi kiya ja sakta kyunke iske purchases ya items records maujood hain. Aap isay Deactivate kar saktay hain." };
        }

        console.log(`[DELETE-VENDOR] Proceeding to mark ${gid} as deleted.`);
        await db.asyncRun(`UPDATE vendors SET sync_status = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE global_id=?`, [gid]);

        syncService.syncPendingRecords('vendors', '/vendors');
        return { success: true, message: "Vendor marked for deletion locally." };
    } catch (err) {
        console.error("delete-vendor Error:", err.message);
        return { success: false, message: "Vendor delete failed: " + err.message };
    }
});

// Expenses - LOCAL FIRST
ipcMain.handle("get-expenses", async (e, companyId) => {
    try {
        const ids = await resolveCompanyIds(companyId);
        const rows = await db.asyncAll("SELECT *, is_active as isActive FROM expenses WHERE (company_id = ? OR company_id = ? OR company_id = ?) AND (sync_status != 'deleted' OR sync_status IS NULL) ORDER BY date DESC", [ids.localId, ids.globalId, String(ids.localId)]);
        return rows;
    } catch (err) {
        console.error("get-expenses Error:", err.message);
        return [];
    }
});

ipcMain.handle("create-expense", async (e, data) => {
    try {
        const { title, amount, date, description, category, companyId, company_id } = data;
        const finalCompanyId = companyId || company_id;
        const result = await db.asyncRun(
            `INSERT INTO expenses (global_id, title, amount, date, description, category, company_id, sync_status, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)`,
            [randomUUID(), title, amount || 0, date, description, category, finalCompanyId]
        );
        syncService.syncPendingRecords('expenses', '/expenses');
        return { success: true, id: result.lastID, message: "Expense saved locally." };
    } catch (err) {
        console.error("create-expense Error:", err.message);
        return { success: false, message: err.message };
    }
});

ipcMain.handle("update-expense", async (e, data) => {
    try {
        const { id, title, amount, date, description, category, companyId } = data;
        const query = `UPDATE expenses SET title=?, amount=?, date=?, description=?, category=?, company_id=?, sync_status='pending', updated_at=CURRENT_TIMESTAMP WHERE id=? OR global_id=?`;
        await db.asyncRun(query, [title, amount, date, description, category, companyId, id, id]);
        syncService.syncPendingRecords('expenses', '/expenses');
        return { success: true, message: "Expense updated locally." };
    } catch (err) {
        console.error("update-expense Error:", err.message);
        return { success: false, message: err.message };
    }
});

ipcMain.handle("delete-expense", async (e, id) => {
    try {
        const row = await db.asyncGet("SELECT global_id FROM expenses WHERE id=? OR global_id=?", [id, id]);
        if (!row) return { success: false, message: "Expense not found" };
        const gid = row.global_id;

        await db.asyncRun(`UPDATE expenses SET sync_status = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE global_id=?`, [gid]);
        syncService.syncPendingRecords('expenses', '/expenses');
        return { success: true, message: "Expense deleted locally." };
    } catch (err) {
        console.error("delete-expense Error:", err.message);
        return { success: false, message: "Expense delete failed: " + err.message };
    }
});

// Inventory - Categories - LOCAL FIRST
ipcMain.handle("get-categories", async (e, companyId) => {
    try {
        const ids = await resolveCompanyIds(companyId);
        const rows = await db.asyncAll(
            "SELECT *, is_active as isActive FROM categories WHERE (company_id = ? OR company_id = ? OR company_id = ?) AND (sync_status != 'deleted' OR sync_status IS NULL)",
            [ids.localId, ids.globalId, String(ids.localId)]
        );
        return rows;
    } catch (err) {
        console.error("get-categories Error:", err.message);
        return [];
    }
});

ipcMain.handle("create-category", async (e, data) => {
    try {
        const { name, companyId, company_id } = data;
        const cid = companyId || company_id;
        const tempId = randomUUID();
        const result = await db.asyncRun(
            `INSERT INTO categories (global_id, name, company_id, sync_status, updated_at) VALUES (?, ?, ?, 'pending', CURRENT_TIMESTAMP)`,
            [tempId, name, cid]
        );
        syncService.syncPendingRecords('categories', '/categories');
        return { success: true, id: result.lastID, global_id: tempId };
    } catch (err) {
        console.error("create-category Error:", err.message);
        return { success: false, message: err.message };
    }
});

// Inventory - Brands - LOCAL FIRST
ipcMain.handle("get-brands", async (e, companyId) => {
    try {
        const ids = await resolveCompanyIds(companyId);
        const rows = await db.asyncAll(
            "SELECT *, is_active as isActive FROM brands WHERE (company_id = ? OR company_id = ? OR company_id = ?) AND (sync_status != 'deleted' OR sync_status IS NULL)",
            [ids.localId, ids.globalId, String(ids.localId)]
        );
        return rows;
    } catch (err) {
        console.error("get-brands Error:", err.message);
        return [];
    }
});

ipcMain.handle("create-brand", async (e, data) => {
    try {
        const { name, companyId, company_id } = data;
        const cid = companyId || company_id;
        const tempId = randomUUID();
        const result = await db.asyncRun(
            `INSERT INTO brands (global_id, name, company_id, sync_status, updated_at) VALUES (?, ?, ?, 'pending', CURRENT_TIMESTAMP)`,
            [tempId, name, cid]
        );
        syncService.syncPendingRecords('brands', '/brands');
        return { success: true, id: result.lastID, global_id: tempId };
    } catch (err) {
        console.error("create-brand Error:", err.message);
        return { success: false, message: err.message };
    }
});

ipcMain.handle("delete-category", async (e, id) => {
    try {
        const row = await db.asyncGet("SELECT global_id FROM categories WHERE id=? OR global_id=?", [id, id]);
        if (!row) return { success: false, message: "Category not found" };
        const gid = row.global_id;

        // Check if any product is using this category
        const countRow = await db.asyncGet("SELECT COUNT(*) as count FROM products WHERE (category_id = ? OR category_id = ?) AND sync_status != 'deleted'", [id, gid]);
        if (countRow && countRow.count > 0) {
            return { success: false, message: "Is Category ko delete nahi kiya ja sakta kyunke is mein products maujood hain." };
        }

        await db.asyncRun(`UPDATE categories SET sync_status = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE global_id=?`, [gid]);
        syncService.syncPendingRecords('categories', '/categories');
        return { success: true, message: "Category marked for deletion locally." };
    } catch (err) {
        console.error("delete-category Error:", err.message);
        return { success: false, message: "Category delete failed: " + err.message };
    }
});

ipcMain.handle("delete-brand", async (e, id) => {
    try {
        const row = await db.asyncGet("SELECT global_id FROM brands WHERE id=? OR global_id=?", [id, id]);
        if (!row) return { success: false, message: "Brand not found" };
        const gid = row.global_id;

        // Check if any product is using this brand
        const countRow = await db.asyncGet("SELECT COUNT(*) as count FROM products WHERE (brand_id = ? OR brand_id = ?) AND sync_status != 'deleted'", [id, gid]);
        if (countRow && countRow.count > 0) {
            return { success: false, message: "Is Brand ko delete nahi kiya ja sakta kyunke ye products mein use horahi hai." };
        }

        await db.asyncRun(`UPDATE brands SET sync_status = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE global_id=?`, [gid]);

        syncService.syncPendingRecords('brands', '/brands');
        return { success: true, message: "Brand marked for deletion locally." };
    } catch (err) {
        console.error("delete-brand Error:", err.message);
        return { success: false, message: "Brand delete failed: " + err.message };
    }
});
ipcMain.handle("get-purchases", async (e, companyId) => {
    try {
        const ids = await resolveCompanyIds(companyId);
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
        const rows = await db.asyncAll(query, [ids.localId, ids.globalId, String(ids.localId)]);

        const purchasesWithItems = [];
        for (const row of rows) {
            const items = await db.asyncAll(`
                SELECT pi.*, 
                       pi.unit_cost as unitCost,
                       pi.total_cost as total,
                       p.name, p.code as sku, p.cost_price as costPrice 
                FROM purchase_items pi
                LEFT JOIN products p ON pi.product_id = p.id OR pi.product_id = p.global_id
                WHERE pi.purchase_id = ? OR pi.purchase_id = ?
            `, [row.global_id, String(row.id)]);

            purchasesWithItems.push({
                ...row,
                vendor: row.vendorName ? { name: row.vendorName } : null,
                items: (items || []).map(item => ({
                    ...item,
                    productId: item.product_id,
                    unitCost: item.unit_cost,
                    total: item.total_cost,
                    product: { id: item.product_id, name: item.name, sku: item.sku }
                }))
            });
        }
        return purchasesWithItems;
    } catch (err) {
        console.error("get-purchases Error:", err.message);
        return [];
    }
});

ipcMain.handle("add-purchase", async (e, data) => {
    try {
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

        await db.asyncRun("BEGIN TRANSACTION");

        const result = await db.asyncRun(
            `INSERT INTO purchases (global_id, vendor_id, total_amount, paid_amount, shipping_cost, discount, tax_amount, notes, payment_method, payment_status, due_date, company_id, sync_status, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)`,
            [tempId, vendor_id, total_amount, paid_amount, shipping_cost, discount, tax_amount, notes, payment_method, payment_status, due_date, companyId]
        );

        if (items && Array.isArray(items)) {
            for (const item of items) {
                const pid = item.productId || item.product_id;
                const qty = item.quantity || 0;
                await db.asyncRun(
                    `INSERT INTO purchase_items (global_id, purchase_id, product_id, quantity, unit_cost, total_cost) VALUES (?, ?, ?, ?, ?, ?)`,
                    [randomUUID(), tempId, pid, qty, item.unit_cost || item.unitCost || item.price || 0, item.total_cost || item.totalCost || item.total || 0]
                );
                await db.asyncRun(`UPDATE products SET stock_quantity = stock_quantity + ? WHERE id=? OR global_id=?`, [qty, pid, pid]);
            }
        }

        if (vendor_id) {
            const balanceChange = total_amount - paid_amount;
            await db.asyncRun(`UPDATE vendors SET current_balance = current_balance + ? WHERE id=? OR global_id=?`, [balanceChange, vendor_id, vendor_id]);
        }

        await db.asyncRun("COMMIT");
        syncService.syncPendingRecords('purchases', '/purchases');
        return { success: true, global_id: tempId, message: "Purchase recorded and stock/balance updated." };
    } catch (err) {
        await db.asyncRun("ROLLBACK").catch(() => { });
        console.error("add-purchase Error:", err.message);
        return { success: false, message: err.message };
    }
});

ipcMain.handle("update-purchase", async (e, data) => {
    try {
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

        const oldPurchase = await db.asyncGet("SELECT * FROM purchases WHERE id=? OR global_id=?", [id, id]);
        if (!oldPurchase) return { success: false, message: "Old purchase not found" };
        const oldGid = oldPurchase.global_id;

        const oldItems = await db.asyncAll("SELECT * FROM purchase_items WHERE purchase_id=?", [oldGid]);

        await db.asyncRun("BEGIN TRANSACTION");

        // 1. Reverse Old Stock
        if (oldItems && Array.isArray(oldItems)) {
            for (const item of oldItems) {
                await db.asyncRun("UPDATE products SET stock_quantity = stock_quantity - ? WHERE id=? OR global_id=?", [item.quantity, item.product_id, item.product_id]);
            }
        }

        // 2. Reverse Old Vendor Balance
        if (oldPurchase.vendor_id) {
            const oldDiff = oldPurchase.total_amount - oldPurchase.paid_amount;
            await db.asyncRun("UPDATE vendors SET current_balance = current_balance - ? WHERE id=? OR global_id=?", [oldDiff, oldPurchase.vendor_id, oldPurchase.vendor_id]);
        }

        // 3. Update Purchase Record
        await db.asyncRun(
            `UPDATE purchases SET vendor_id=?, ref_number=?, total_amount=?, paid_amount=?, shipping_cost=?, discount=?, tax_amount=?, notes=?, payment_method=?, payment_status=?, due_date=?, company_id=?, sync_status='pending', updated_at=CURRENT_TIMESTAMP WHERE id=? OR global_id=?`,
            [vendor_id, ref_number, total_amount, paid_amount, shipping_cost, discount, tax_amount, notes, payment_method, payment_status, due_date, companyId, id, id]
        );

        // 4. Delete and Re-insert items, Update New Stock
        await db.asyncRun("DELETE FROM purchase_items WHERE purchase_id = ?", [oldGid]);

        if (items && Array.isArray(items)) {
            for (const item of items) {
                const pid = item.productId || item.product_id;
                const qty = item.quantity || 0;
                await db.asyncRun(
                    `INSERT INTO purchase_items (global_id, purchase_id, product_id, quantity, unit_cost, total_cost) VALUES (?, ?, ?, ?, ?, ?)`,
                    [randomUUID(), oldGid, pid, qty, item.unit_cost || item.unitCost || item.price || 0, item.total_cost || item.totalCost || item.total || 0]
                );
                await db.asyncRun(`UPDATE products SET stock_quantity = stock_quantity + ? WHERE id=? OR global_id=?`, [qty, pid, pid]);
            }
        }

        // 5. Apply New Vendor Balance
        if (vendor_id) {
            const newDiff = total_amount - paid_amount;
            await db.asyncRun("UPDATE vendors SET current_balance = current_balance + ? WHERE id=? OR global_id=?", [newDiff, vendor_id, vendor_id]);
        }

        await db.asyncRun("COMMIT");
        syncService.syncPendingRecords('purchases', '/purchases');
        return { success: true, message: "Purchase updated and stock/balance adjusted." };
    } catch (err) {
        await db.asyncRun("ROLLBACK").catch(() => { });
        console.error("update-purchase Error:", err.message);
        return { success: false, message: err.message };
    }
});

ipcMain.handle("delete-purchase", async (e, id) => {
    try {
        const purchase = await db.asyncGet("SELECT * FROM purchases WHERE id = ? OR global_id = ?", [id, id]);
        if (!purchase) return { success: false, message: "Purchase not found" };
        const gid = purchase.global_id;

        const items = await db.asyncAll("SELECT * FROM purchase_items WHERE purchase_id = ?", [gid]);

        await db.asyncRun("BEGIN TRANSACTION");

        // 1. Reverse Stock
        if (items && Array.isArray(items)) {
            for (const item of items) {
                await db.asyncRun("UPDATE products SET stock_quantity = stock_quantity - ? WHERE id=? OR global_id=?", [item.quantity, item.product_id, item.product_id]);
            }
        }

        // 2. Adjust Vendor Balance
        if (purchase.vendor_id) {
            const diff = purchase.total_amount - purchase.paid_amount;
            await db.asyncRun("UPDATE vendors SET current_balance = current_balance - ? WHERE id=? OR global_id=?", [diff, purchase.vendor_id, purchase.vendor_id]);
        }

        // 3. Mark Purchase as Deleted
        await db.asyncRun("UPDATE purchases SET sync_status = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE global_id = ?", [gid]);

        await db.asyncRun("COMMIT");
        syncService.syncPendingRecords('purchases', '/purchases');
        return { success: true, message: "Purchase deleted and stock/balance restored." };
    } catch (err) {
        await db.asyncRun("ROLLBACK").catch(() => { });
        console.error("delete-purchase Error:", err.message);
        return { success: false, message: err.message };
    }
});

// ==========================================
// RETURNS - Sale Returns - LOCAL FIRST
// ==========================================
ipcMain.handle("get-sale-returns", async (e, companyId) => {
    try {
        const ids = await resolveCompanyIds(companyId);
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
        const rows = await db.asyncAll(query, [ids.localId, ids.globalId, String(ids.localId)]);
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
        return mapped;
    } catch (err) {
        console.error("Error fetching sale returns:", err);
        return [];
    }
});

ipcMain.handle("add-sale-return", async (e, data) => {
    try {
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

        await db.asyncRun("BEGIN TRANSACTION");

        const result = await db.asyncRun(
            `INSERT INTO sale_returns (global_id, customer_id, sale_id, invoice_no, sub_total, tax, total_amount, notes, company_id, sync_status, date, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [tempId, customer_id, sale_id, invoice_no, sub_total, tax, total_amount, notes, companyId]
        );

        const returnId = result.lastID;

        // Add items and Update Stock
        if (items && Array.isArray(items)) {
            for (const item of items) {
                const pid = item.productId || item.product_id;
                const qty = parseInt(item.quantity || 0);
                const price = item.price || item.unit_price || 0;
                const total = item.total || (qty * price);

                await db.asyncRun(
                    `INSERT INTO sale_return_items (global_id, return_id, product_id, quantity, price, total) VALUES (?, ?, ?, ?, ?, ?)`,
                    [randomUUID(), tempId, pid, qty, price, total]
                );
                // For Sale Return, Stock INCREASES
                await db.asyncRun(`UPDATE products SET stock_quantity = stock_quantity + ?, sync_status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE id = ? OR global_id = ?`, [qty, pid, pid]);
            }
        }

        // Update Customer Balance (Decrease Receivable)
        if (customer_id) {
            await db.asyncRun(`UPDATE customers SET current_balance = current_balance - ?, sync_status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE id = ? OR global_id = ?`, [total_amount, customer_id, customer_id]);
        }

        await db.asyncRun("COMMIT");
        syncService.syncPendingRecords('sale_returns', '/returns/sales');
        return { success: true, id: returnId, global_id: tempId, message: "Sale return recorded locally, stock updated, and balance adjusted." };
    } catch (err) {
        await db.asyncRun("ROLLBACK").catch(() => { });
        console.error("add-sale-return Error:", err.message);
        return { success: false, message: err.message };
    }
});

ipcMain.handle("delete-sale-return", async (e, id) => {
    try {
        const row = await db.asyncGet("SELECT * FROM sale_returns WHERE id = ? OR global_id = ?", [id, id]);
        if (!row) return { success: false, message: "Sale return not found" };
        const gid = row.global_id;
        const customer_id = row.customer_id;
        const total_amount = row.total_amount || 0;

        const items = await db.asyncAll("SELECT * FROM sale_return_items WHERE return_id = ?", [gid]);

        await db.asyncRun("BEGIN TRANSACTION");

        // 1. Reverse Stock (Decrease Stock, as we are cancelling the return)
        if (items && items.length > 0) {
            for (const item of items) {
                await db.asyncRun("UPDATE products SET stock_quantity = stock_quantity - ?, sync_status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE id=? OR global_id=?", [item.quantity, item.product_id, item.product_id]);
            }
        }

        // 2. Reverse Customer Balance (Increase Receivable, as we are cancelling the credit)
        if (customer_id) {
            await db.asyncRun(`UPDATE customers SET current_balance = current_balance + ?, sync_status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE id = ? OR global_id = ?`, [total_amount, customer_id, customer_id]);
        }

        // 3. Mark as Deleted
        await db.asyncRun("UPDATE sale_returns SET sync_status = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE global_id = ?", [gid]);

        await db.asyncRun("COMMIT");
        syncService.syncPendingRecords('sale_returns', '/returns/sales');
        return { success: true, message: "Sale return deleted, stock and balance reverted." };
    } catch (err) {
        await db.asyncRun("ROLLBACK").catch(() => { });
        console.error("delete-sale-return Error:", err.message);
        return { success: false, message: err.message };
    }
});

// ==========================================
// RETURNS - Purchase Returns - LOCAL FIRST
// ==========================================
ipcMain.handle("get-purchase-returns", async (e, companyId) => {
    try {
        const ids = await resolveCompanyIds(companyId);
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
        const rows = await db.asyncAll(query, [ids.localId, ids.globalId, String(ids.localId)]);
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
        return mapped;
    } catch (err) {
        console.error("Error fetching purchase returns:", err);
        return [];
    }
});

ipcMain.handle("add-purchase-return", async (e, data) => {
    try {
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

        await db.asyncRun("BEGIN TRANSACTION");

        const result = await db.asyncRun(
            `INSERT INTO purchase_returns (global_id, vendor_id, purchase_id, invoice_no, sub_total, tax, total_amount, notes, company_id, sync_status, date, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [tempId, vendor_id, purchase_id, invoice_no, sub_total, tax, total_amount, notes, companyId]
        );

        const returnId = result.lastID;

        // Add items and Update Stock
        if (items && Array.isArray(items)) {
            for (const item of items) {
                const pid = item.productId || item.product_id;
                const qty = parseInt(item.quantity || 0);
                const uCost = item.unit_cost || item.unitCost || item.price || 0;
                const total = item.total || (qty * uCost);

                await db.asyncRun(
                    `INSERT INTO purchase_return_items (global_id, return_id, product_id, quantity, unit_cost, total) VALUES (?, ?, ?, ?, ?, ?)`,
                    [randomUUID(), tempId, pid, qty, uCost, total]
                );
                // For Purchase Return, Stock DECREASES
                await db.asyncRun(`UPDATE products SET stock_quantity = stock_quantity - ?, sync_status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE id = ? OR global_id = ?`, [qty, pid, pid]);
            }
        }

        // Update Vendor Balance (Decrease Payable)
        if (vendor_id) {
            await db.asyncRun(`UPDATE vendors SET current_balance = current_balance - ?, sync_status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE id = ? OR global_id = ?`, [total_amount, vendor_id, vendor_id]);
        }

        await db.asyncRun("COMMIT");
        syncService.syncPendingRecords('purchase_returns', '/returns/purchases');
        return { success: true, id: returnId, global_id: tempId, message: "Purchase return recorded locally, stock updated, and balance adjusted." };
    } catch (err) {
        await db.asyncRun("ROLLBACK").catch(() => { });
        console.error("add-purchase-return Error:", err.message);
        return { success: false, message: err.message };
    }
});

ipcMain.handle("delete-purchase-return", async (e, id) => {
    try {
        const row = await db.asyncGet("SELECT * FROM purchase_returns WHERE id = ? OR global_id = ?", [id, id]);
        if (!row) return { success: false, message: "Purchase return not found" };
        const gid = row.global_id;
        const vendor_id = row.vendor_id;
        const total_amount = row.total_amount || 0;

        const items = await db.asyncAll("SELECT * FROM purchase_return_items WHERE return_id = ?", [gid]);

        await db.asyncRun("BEGIN TRANSACTION");

        // 1. Reverse Stock (Increase Stock, as we are cancelling the return)
        if (items && items.length > 0) {
            for (const item of items) {
                await db.asyncRun("UPDATE products SET stock_quantity = stock_quantity + ?, sync_status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE id=? OR global_id=?", [item.quantity, item.product_id, item.product_id]);
            }
        }

        // 2. Reverse Vendor Balance (Increase Payable, as we are cancelling the debit note)
        if (vendor_id) {
            await db.asyncRun(`UPDATE vendors SET current_balance = current_balance + ?, sync_status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE id = ? OR global_id = ?`, [total_amount, vendor_id, vendor_id]);
        }

        // 3. Mark as Deleted
        await db.asyncRun("UPDATE purchase_returns SET sync_status = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE global_id = ?", [gid]);

        await db.asyncRun("COMMIT");
        syncService.syncPendingRecords('purchase_returns', '/returns/purchases');
        return { success: true, message: "Purchase return deleted, stock and balance reverted." };
    } catch (err) {
        await db.asyncRun("ROLLBACK").catch(() => { });
        console.error("delete-purchase-return Error:", err.message);
        return { success: false, message: err.message };
    }
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
    const employeeStatus = params?.employeeStatus;

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
        dateFilter = ` AND date(sale_date) BETWEEN date('${startStr}') AND date('${endStr}')`;
    } else {
        if (period === 'Daily') {
            dateFilter = ` AND date(sale_date) >= date('${now.toISOString().split('T')[0]}')`;
        } else if (period === 'Weekly') {
            const lastWeek = new Date(new Date().setDate(now.getDate() - 7)).toISOString().split('T')[0];
            dateFilter = ` AND date(sale_date) >= date('${lastWeek}')`;
        } else if (period === 'Monthly') {
            const lastMonth = new Date(new Date().setMonth(now.getMonth() - 1)).toISOString().split('T')[0];
            dateFilter = ` AND date(sale_date) >= date('${lastMonth}')`;
        } else if (period === 'Yearly') {
            const lastYear = new Date(new Date().setFullYear(now.getFullYear() - 1)).toISOString().split('T')[0];
            dateFilter = ` AND date(sale_date) >= date('${lastYear}')`;
        } else {
            // All Time
            dateFilter = "";
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
        detailedCustomers: [],
        detailedHRM: [],
        topStaff: []
    };

    const dbGet = (sql, p) => db.asyncGet(sql, p).catch(() => null);
    const dbAll = (sql, p) => db.asyncAll(sql, p).catch(() => []);

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
        let srSql = `SELECT SUM(total_amount) as total, COUNT(*) as count FROM sale_returns WHERE ${companyMatch} ${dateFilter.replace(/sale_date/g, 'date')}`;
        let srP = [...qParams];
        if (customerId && customerId !== 'all') {
            srSql += ` AND (customer_id = ? OR customer_id = (SELECT id FROM customers WHERE global_id = ?) OR customer_id = (SELECT id FROM customers WHERE global_id = ?))`;
            srP.push(customerId, customerId, customerId);
        }
        const srRow = await dbGet(srSql, srP);
        stats.totalSalesReturns = srRow?.total || 0;
        stats.returnCount += (srRow?.count || 0);

        let prSql = `SELECT SUM(total_amount) as total, COUNT(*) as count FROM purchase_returns WHERE ${companyMatch} ${dateFilter.replace(/sale_date/g, 'date')}`;
        let prP = [...qParams];
        if (vendorId && vendorId !== 'all') {
            prSql += ` AND (vendor_id = ? OR vendor_id = (SELECT id FROM vendors WHERE global_id = ?) OR vendor_id = (SELECT id FROM vendors WHERE global_id = ?))`;
            prP.push(vendorId, vendorId, vendorId);
        }
        const prRow = await dbGet(prSql, prP);
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
            WHERE ${companyMatch.replace(/company_id/g, 's.company_id')} ${dateFilter.replace(/sale_date/g, 's.sale_date')}`;
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

        const custRow = await dbGet(`SELECT SUM(current_balance) as total, COUNT(*) as count FROM customers WHERE ${companyMatch} AND sync_status != 'deleted'`, qParams);
        stats.totalReceivables = custRow?.total || 0;
        stats.customerCount = custRow?.count || 0;

        const salRow = await dbGet(`SELECT SUM(net_salary) as total FROM salary_records WHERE ${companyMatch} ${dateFilter.replace(/sale_date/g, 'payment_date')}`, qParams);
        stats.totalSalaries = salRow?.total || 0;

        const empStats = await dbGet(`SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active,
            SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive
            FROM employees WHERE ${companyMatch} AND sync_status != 'deleted'`, qParams);
        stats.employeeCount = empStats?.active || 0;
        stats.totalEmployees = empStats?.total || 0;
        stats.inactiveEmployees = empStats?.inactive || 0;

        // 4.1 Detailed HRM / Salaries
        let hrmSql = `SELECT s.*, e.first_name || ' ' || e.last_name as staff_name, e.designation, e.is_active 
                      FROM salary_records s 
                      JOIN employees e ON s.employee_id = e.id OR s.employee_id = e.global_id 
                      WHERE ${companyMatch.replace(/company_id/g, 's.company_id')} ${dateFilter.replace(/sale_date/g, 'date(s.payment_date)')}`;
        let hrmP = [...qParams];
        if (employeeId && employeeId !== 'all') {
            hrmSql += ` AND (s.employee_id = ? OR s.employee_id = (SELECT id FROM employees WHERE global_id = ?))`;
            hrmP.push(employeeId, employeeId);
        }
        if (employeeStatus && employeeStatus !== 'all') {
            hrmSql += ` AND e.is_active = ?`;
            hrmP.push(employeeStatus === 'active' ? 1 : 0);
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

        // Detailed Customers
        let detCustSql = `SELECT * FROM customers WHERE ${companyMatch} AND sync_status != 'deleted'`;
        let detCustP = [...qParams];
        if (customerId && customerId !== 'all') {
            detCustSql += ` AND (id = ? OR global_id = ?)`;
            detCustP.push(customerId, customerId);
        }
        if (paymentStatus && paymentStatus !== 'all') {
            if (paymentStatus.toLowerCase() === 'credit') {
                detCustSql += ` AND current_balance > 0`;
            } else if (paymentStatus.toLowerCase() === 'paid') {
                detCustSql += ` AND (current_balance <= 0 OR current_balance IS NULL)`;
            }
        }
        const detCustomers = await dbAll(detCustSql + " ORDER BY name ASC", detCustP);
        stats.detailedCustomers = detCustomers.map(c => ({
            ...c,
            balance: c.current_balance || c.balance || 0
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

            let dSRSql = `SELECT SUM(total_amount) as t FROM sale_returns WHERE ${companyMatch} AND date(date) = ?`;
            let dSRP = [...qParams, dStr];
            if (customerId && customerId !== 'all') {
                dSRSql += ` AND (customer_id = ? OR customer_id = (SELECT id FROM customers WHERE global_id = ?))`;
                dSRP.push(customerId, customerId);
            }
            const dSR = await dbGet(dSRSql, dSRP);

            const dSal = await dbGet(`SELECT SUM(net_salary) as t FROM salary_records WHERE ${companyMatch} AND (date(payment_date) = ? OR date(month) = ?)`, [...qParams, dStr, dStr]);

            // Payables calculation
            let dPaySql = `SELECT SUM(v.current_balance) as t 
                           FROM vendors v 
                           WHERE ${companyMatch.replace(/company_id/g, 'v.company_id')} 
                           AND v.sync_status != 'deleted'`;
            let dPayP = [...qParams];
            if (vendorId && vendorId !== 'all') {
                dPaySql += ` AND (v.id = ? OR v.global_id = ?)`;
                dPayP.push(vendorId, vendorId);
            }
            const dPay = await dbGet(dPaySql, dPayP);

            // Receivables calculation
            let dRecSql = `SELECT SUM(c.current_balance) as t 
                           FROM customers c 
                           WHERE ${companyMatch.replace(/company_id/g, 'c.company_id')} 
                           AND c.sync_status != 'deleted'`;
            let dRecP = [...qParams];
            if (customerId && customerId !== 'all') {
                dRecSql += ` AND (c.id = ? OR c.global_id = ?)`;
                dRecP.push(customerId, customerId);
            }
            const dRec = await dbGet(dRecSql, dRecP);

            let dCogsSql = `SELECT SUM(si.quantity * p.cost_price) as t
                            FROM sale_items si
                            JOIN sales s ON si.sale_id = s.id OR si.sale_id = s.global_id
                            JOIN products p ON si.product_id = p.id OR si.product_id = p.global_id
                            WHERE ${companyMatch.replace(/company_id/g, 's.company_id')} AND date(s.sale_date) = ?`;
            let dCogsP = [...qParams, dStr];
            if (customerId && customerId !== 'all') {
                dCogsSql += ` AND (s.customer_id = ? OR s.customer_id = (SELECT id FROM customers WHERE global_id = ?))`;
                dCogsP.push(customerId, customerId);
            }
            const dCogs = await dbGet(dCogsSql, dCogsP);

            const isF = (customerId && customerId !== 'all') || (vendorId && vendorId !== 'all');
            const dailyOps = isF ? 0 : (dE?.t || 0) + (dSal?.t || 0);

            stats.recentDays.push({
                date: dStr,
                sales: dS?.t || 0,
                invoices: dS?.c || 0,
                purchases: dP?.t || 0,
                expenses: dailyOps,
                cogs: dCogs?.t || 0,
                returns: dSR?.t || 0,
                profit: ((dS?.t || 0) - (dSR?.t || 0)) - (dailyOps + (dCogs?.t || 0)),
                payables: dPay?.t || 0,
                receivables: dRec?.t || 0
            });
        }

        // 7. Top Breakdowns
        let topProdSql = `SELECT p.name, SUM(si.quantity) as qtySold, SUM(si.total_price) as totalValue 
                          FROM sale_items si 
                          JOIN products p ON si.product_id = p.id OR si.product_id = p.global_id 
                          JOIN sales s ON si.sale_id = s.id OR si.sale_id = s.global_id 
                          WHERE ${companyMatch.replace(/company_id/g, 's.company_id')} ${dateFilter.replace(/sale_date/g, 's.sale_date')}`;
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
                             WHERE ${companyMatch.replace(/company_id/g, 'p.company_id')} ${dateFilter.replace(/sale_date/g, 'p.purchase_date')}`;
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

        // Calculate Gross Profit: (Total Sales - Returns) - COGS
        stats.grossProfit = (stats.totalSales - stats.totalSalesReturns) - stats.totalCOGS;

        // Operating expenses are company-wide. If filtering by a specific person, 
        // we show the Gross Profit (direct contribution) as the result since we 
        // can't accurately attribute rent/salaries to one customer/vendor.
        const isFiltered = (customerId && customerId !== 'all') || (vendorId && vendorId !== 'all');
        stats.operatingExpenses = isFiltered ? 0 : (stats.totalExpenses + stats.totalSalaries);
        stats.netProfit = stats.grossProfit - stats.operatingExpenses;

        // 8. 3-Month Net Profit History (for cards)
        stats.monthlyHistory = [];
        for (let i = 0; i < 3; i++) {
            const mDate = new Date();
            mDate.setMonth(now.getMonth() - i);
            const mStr = mDate.toISOString().slice(0, 7); // YYYY-MM

            const mMatch = `strftime('%Y-%m', sale_date) = ?`;
            const mEMatch = `strftime('%Y-%m', date) = ?`;
            const mHMatch = `(strftime('%Y-%m', payment_date) = ? OR strftime('%Y-%m', month) = ?)`;

            const mS = await dbGet(`SELECT SUM(grand_total) as t FROM sales WHERE ${companyMatch} AND ${mMatch}`, [...qParams, mStr]);
            const mSR = await dbGet(`SELECT SUM(total_amount) as t FROM sale_returns WHERE ${companyMatch} AND ${mEMatch}`, [...qParams, mStr]);
            const mCOGS = await dbGet(`SELECT SUM(si.quantity * p.cost_price) as t FROM sale_items si JOIN sales s ON si.sale_id = s.id OR si.sale_id = s.global_id JOIN products p ON si.product_id = p.id OR si.product_id = p.global_id WHERE ${companyMatch.replace(/company_id/g, 's.company_id')} AND strftime('%Y-%m', s.sale_date) = ?`, [...qParams, mStr]);
            const mE = await dbGet(`SELECT SUM(amount) as t FROM expenses WHERE ${companyMatch} AND ${mEMatch}`, [...qParams, mStr]);
            const mSal = await dbGet(`SELECT SUM(net_salary) as t FROM salary_records WHERE ${companyMatch} AND ${mHMatch}`, [...qParams, mStr, mStr]);

            const monthName = mDate.toLocaleString('default', { month: 'short' });
            const mNet = (mS?.t || 0) - (mSR?.t || 0) - (mCOGS?.t || 0) - (mE?.t || 0) - (mSal?.t || 0);

            stats.monthlyHistory.push({
                month: monthName,
                year: mDate.getFullYear(),
                profit: mNet
            });
        }

        return { ...stats, success: true };
    } catch (err) {
        console.error("Report Generation Error:", err);
        return { success: false, message: err.message };
    }
});


// Accounts & Accounting
ipcMain.handle("get-accounts", async (e, companyId) => {
    try {
        const ids = await resolveCompanyIds(companyId);
        return await db.asyncAll("SELECT * FROM accounts WHERE (company_id = ? OR company_id = ? OR company_id = ?) AND (sync_status != 'deleted' OR sync_status IS NULL) ORDER BY name ASC", [ids.localId, ids.globalId, String(ids.localId)]);
    } catch (err) {
        console.error("get-accounts Error:", err.message);
        return [];
    }
});

ipcMain.handle("create-account", async (e, data) => {
    try {
        const { name, type, balance, companyId } = data;
        const tempId = randomUUID();
        const result = await db.asyncRun(
            `INSERT INTO accounts (global_id, name, type, balance, company_id, sync_status, updated_at) VALUES (?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)`,
            [tempId, name, type, balance || 0, companyId]
        );
        syncService.syncPendingRecords('accounts', '/account');
        return { success: true, id: result.lastID, global_id: tempId };
    } catch (err) {
        console.error("create-account Error:", err.message);
        return { success: false, message: err.message };
    }
});

ipcMain.handle("get-transactions", async (e, accountId) => {
    try {
        return await db.asyncAll("SELECT * FROM transactions WHERE account_id = ? ORDER BY date DESC", [accountId]);
    } catch (err) {
        console.error("get-transactions Error:", err.message);
        return [];
    }
});

ipcMain.handle("create-transaction", async (e, data) => {
    try {
        const { account_id, type, amount, date, description, companyId } = data;
        const tempId = randomUUID();
        const result = await db.asyncRun(
            `INSERT INTO transactions (global_id, account_id, type, amount, date, description, company_id, sync_status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)`,
            [tempId, account_id, type, amount, date, description, companyId]
        );
        syncService.syncPendingRecords();
        return { success: true, id: result.lastID, global_id: tempId };
    } catch (err) {
        console.error("create-transaction Error:", err.message);
        return { success: false, message: err.message };
    }
});

// ==========================================
// HRM MODULE - EMPLOYEES
// ==========================================

// Employees - CRUD Operations
ipcMain.handle("get-employees", async (e, companyId) => {
    try {
        const ids = await resolveCompanyIds(companyId);
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
        return await db.asyncAll(query, [ids.localId, ids.globalId, String(ids.localId)]);
    } catch (err) {
        console.error("Error loading employees:", err);
        return [];
    }
});

ipcMain.handle("create-employee", async (e, data) => {
    try {
        const { firstName, lastName, phone, designation, salary, hourly_rate, joiningDate, companyId, isActive } = data;
        const tempId = randomUUID();
        const activeVal = isActive === undefined ? 1 : (isActive ? 1 : 0);

        const result = await db.asyncRun(
            `INSERT INTO employees (global_id, first_name, last_name, phone, designation, salary, hourly_rate, joining_date, company_id, sync_status, is_active, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, CURRENT_TIMESTAMP)`,
            [tempId, firstName, lastName || '', phone || '', designation, salary || 0, hourly_rate || 0, joiningDate, companyId, activeVal]
        );
        syncService.syncPendingRecords('employees', '/employees');
        return { success: true, id: result.lastID, global_id: tempId, message: "Employee created locally" };
    } catch (err) {
        console.error("create-employee Error:", err.message);
        return { success: false, message: err.message };
    }
});

ipcMain.handle("update-employee", async (e, data) => {
    try {
        const { id, firstName, lastName, phone, designation, salary, hourly_rate, joiningDate, isActive } = data;
        const activeVal = isActive === undefined ? 1 : (isActive ? 1 : 0);

        await db.asyncRun(
            `UPDATE employees SET 
                first_name=?, last_name=?, phone=?, designation=?, salary=?, hourly_rate=?, joining_date=?, is_active=?,
                sync_status='pending', updated_at=CURRENT_TIMESTAMP 
             WHERE id=? OR global_id=?`,
            [firstName, lastName || '', phone || '', designation, salary || 0, hourly_rate || 0, joiningDate, activeVal, id, id]
        );
        syncService.syncPendingRecords('employees', '/employees');
        return { success: true, message: "Employee updated locally" };
    } catch (err) {
        console.error("update-employee Error:", err.message);
        return { success: false, message: err.message };
    }
});

ipcMain.handle("delete-employee", async (e, id) => {
    try {
        const row = await db.asyncGet("SELECT global_id FROM employees WHERE id=? OR global_id=?", [id, id]);
        if (!row) return { success: false, message: "Employee not found" };
        const gid = row.global_id;

        // Check for linked records (Attendance or Salaries)
        const check = await db.asyncGet(`
            SELECT 
                (SELECT COUNT(*) FROM attendances WHERE (employee_id = ? OR employee_id = ?) AND sync_status != 'deleted') +
                (SELECT COUNT(*) FROM salary_records WHERE (employee_id = ? OR employee_id = ?) AND sync_status != 'deleted') as linked
        `, [id, gid, id, gid]);

        if (check && check.linked > 0) {
            return { success: false, message: "Is employee ko delete nahi kiya ja sakta kyunke iske attendance ya salary records maujood hain. Aap isay de-activate kar saktay hain." };
        }

        await db.asyncRun(`UPDATE employees SET sync_status='deleted', updated_at=CURRENT_TIMESTAMP WHERE global_id=?`, [gid]);
        syncService.syncPendingRecords('employees', '/employees');
        return { success: true, message: "Employee marked for deletion locally." };
    } catch (err) {
        console.error("delete-employee Error:", err.message);
        return { success: false, message: "Employee delete failed: " + err.message };
    }
});

// ==========================================
// HRM MODULE - ATTENDANCE & SALARIES
// ==========================================
// Attendance - By Company + Date (FIXED)
ipcMain.handle("get-attendance", async (e, params) => {
    try {
        const { companyId, date } = params;
        const ids = await resolveCompanyIds(companyId);

        const query = `
            SELECT a.*,
                   a.employee_id as employeeId,
                   a.check_in as checkIn,
                   a.check_out as checkOut,
                   e.id as localEmployeeId,
                   e.global_id as employeeGlobalId,
                   e.first_name as firstName,
                   e.last_name as lastName
            FROM attendances a
            LEFT JOIN employees e ON a.employee_id = e.global_id OR a.employee_id = CAST(e.id AS TEXT)
            WHERE (a.company_id = ? OR a.company_id = ? OR a.company_id = ?)
              AND a.date = ?
              AND (a.sync_status != 'deleted' OR a.sync_status IS NULL)
            ORDER BY e.first_name ASC
        `;

        return await db.asyncAll(query, [ids.localId, ids.globalId, String(ids.localId), date]);
    } catch (err) {
        console.error("Error loading attendance:", err);
        return [];
    }
});

// Save Attendance - CRITICAL FIX: Proper employeeId matching
ipcMain.handle("save-attendance", async (e, data) => {
    try {
        const { employeeId, status, date } = data;

        // CRITICAL: Check attendance for THIS SPECIFIC employee on THIS date
        const existing = await db.asyncGet(
            "SELECT id, global_id FROM attendances WHERE (employee_id = ? OR employee_id = ?) AND date = ?",
            [employeeId, employeeId, date]
        );

        if (existing) {
            // Update existing record for THIS employee only
            await db.asyncRun(
                `UPDATE attendances SET 
                    status=?, 
                    sync_status='pending', 
                    updated_at=CURRENT_TIMESTAMP 
                 WHERE id=? OR global_id=?`,
                [status, existing.id, existing.global_id]
            );
            syncService.syncPendingRecords('attendances', '/attendance');
            return { success: true, message: "Attendance updated" };
        } else {
            // Create new record for THIS employee
            const tempId = randomUUID();
            // Get companyId from employee
            const emp = await db.asyncGet("SELECT company_id FROM employees WHERE id=? OR global_id=?", [employeeId, employeeId]);
            const companyId = emp?.company_id;

            await db.asyncRun(
                `INSERT INTO attendances (global_id, employee_id, date, status, company_id, sync_status, updated_at) 
                 VALUES (?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)`,
                [tempId, employeeId, date, status, companyId]
            );
            syncService.syncPendingRecords('attendances', '/attendance');
            return { success: true, global_id: tempId, message: "Attendance created" };
        }
    } catch (err) {
        console.error("save-attendance Error:", err.message);
        return { success: false, message: err.message };
    }
});

ipcMain.handle("create-attendance", async (e, data) => {
    try {
        const { employee_id, date, status, check_in, check_out, companyId } = data;
        const tempId = randomUUID();
        const result = await db.asyncRun(
            `INSERT INTO attendances (global_id, employee_id, date, status, check_in, check_out, company_id, sync_status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)`,
            [tempId, employee_id, date, status, check_in, check_out, companyId]
        );
        syncService.syncPendingRecords('attendances', '/attendance');
        return { success: true, id: result.lastID, global_id: tempId };
    } catch (err) {
        console.error("create-attendance Error:", err.message);
        return { success: false, message: err.message };
    }
});

ipcMain.handle("update-attendance", async (e, data) => {
    try {
        const { id, status, check_in, check_out, companyId } = data;
        await db.asyncRun(
            `UPDATE attendances SET status=?, check_in=?, check_out=?, company_id=?, sync_status='pending', updated_at=CURRENT_TIMESTAMP WHERE id=? OR global_id=?`,
            [status, check_in, check_out, companyId, id, id]
        );
        syncService.syncPendingRecords('attendances', '/attendance');
        return { success: true, message: "Attendance updated locally." };
    } catch (err) {
        console.error("update-attendance Error:", err.message);
        return { success: false, message: err.message };
    }
});

ipcMain.handle("delete-attendance", async (e, id) => {
    try {
        const row = await db.asyncGet("SELECT global_id FROM attendances WHERE id=? OR global_id=?", [id, id]);
        if (!row) return { success: false, message: "Attendance record not found" };
        const gid = row.global_id;

        await db.asyncRun(`UPDATE attendances SET sync_status='deleted', updated_at=CURRENT_TIMESTAMP WHERE global_id=?`, [gid]);
        syncService.syncPendingRecords('attendances', '/attendance');
        return { success: true, message: "Attendance marked for deletion." };
    } catch (err) {
        console.error("delete-attendance Error:", err.message);
        return { success: false, message: "Attendance delete failed: " + err.message };
    }
});

// EMPLOYEE DETAILS HANDLER
ipcMain.handle("get-employee-details", async (e, params) => {
    try {
        const employeeId = typeof params === 'object' ? params.employeeId : params;
        const startDate = params?.startDate;
        const endDate = params?.endDate;

        const emp = await db.asyncGet("SELECT global_id FROM employees WHERE id = ? OR global_id = ?", [employeeId, employeeId]);
        const targetId = emp ? emp.global_id : employeeId;

        let dateFilter = "";
        let pExtra = [];
        if (startDate && endDate) {
            dateFilter = ` AND date BETWEEN ? AND ?`;
            pExtra = [startDate, endDate];
        }

        const statsQuery = `
            SELECT 
                COUNT(CASE WHEN status = 'Present' THEN 1 END) as present,
                COUNT(CASE WHEN status = 'Absent' THEN 1 END) as absent,
                COUNT(CASE WHEN status = 'Late' THEN 1 END) as late,
                COUNT(CASE WHEN status = 'Leave' THEN 1 END) as leave
            FROM attendances 
            WHERE (employee_id = ? OR employee_id = ?) ${dateFilter}
        `;

        const logsQuery = `
            SELECT id, date, status, check_in as checkIn, check_out as checkOut 
            FROM attendances 
            WHERE (employee_id = ? OR employee_id = ?) ${dateFilter}
            ORDER BY date DESC 
            LIMIT 100
        `;

        const queryParams = [employeeId, targetId, ...pExtra];

        const stats = await db.asyncGet(statsQuery, queryParams);
        const logs = await db.asyncAll(logsQuery, queryParams);

        return { stats: stats || {}, logs: logs || [] };
    } catch (err) {
        console.error("get-employee-details Error:", err.message);
        return { stats: {}, logs: [] };
    }
});

// Salaries - For Payroll Component
ipcMain.handle("get-salaries", async (e, params) => {
    try {
        const { companyId, month } = params;
        const ids = await resolveCompanyIds(companyId);

        const query = `
            SELECT s.*,
                   COALESCE(e.id, s.employee_id) as employeeId,
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

        const rows = await db.asyncAll(query, [ids.localId, ids.globalId, String(ids.localId), month]);

        return (rows || []).map(row => ({
            ...row,
            employee: {
                id: row.employeeId,
                firstName: row.firstName,
                lastName: row.lastName,
                designation: row.designation,
                hourlyRate: row.hourly_rate
            }
        }));
    } catch (err) {
        console.error("Error loading salaries:", err);
        return [];
    }
});

ipcMain.handle("create-salary", async (e, data) => {
    try {
        const { companyId, employeeId, month, baseSalary, bonus, overtimeHours, overtimePay, deductions, netSalary, notes } = data;
        const tempId = randomUUID();

        const result = await db.asyncRun(
            `INSERT INTO salary_records (
                global_id, employee_id, month, base_salary, bonus, overtime_hours, 
                overtime_pay, deductions, net_salary, notes, status, payment_date, company_id, sync_status, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)`,
            [tempId, employeeId, month, baseSalary, bonus || 0, overtimeHours || 0, overtimePay || 0, deductions || 0, netSalary, notes || '', data.status || 'PAID', data.paymentDate || new Date().toISOString(), companyId]
        );
        syncService.syncPendingRecords('salary_records', '/salary-records');
        return { success: true, id: result.lastID, global_id: tempId, message: "Salary created locally" };
    } catch (err) {
        console.error("Error creating salary:", err);
        return { success: false, message: err.message };
    }
});

ipcMain.handle("get-salary-records", async (e, companyId) => {
    try {
        const ids = await resolveCompanyIds(companyId);
        return await db.asyncAll("SELECT * FROM salary_records WHERE (company_id = ? OR company_id = ? OR company_id = ?) AND (sync_status != 'deleted' OR sync_status IS NULL) ORDER BY month DESC", [ids.localId, ids.globalId, String(ids.localId)]);
    } catch (err) {
        console.error("get-salary-records Error:", err.message);
        return [];
    }
});

ipcMain.handle("add-salary-record", async (e, data) => {
    try {
        const { employee_id, month, base_salary, bonus, overtime_hours, overtime_pay, deductions, net_salary, payment_date, status, companyId } = data;
        const tempId = randomUUID();
        const result = await db.asyncRun(
            `INSERT INTO salary_records (global_id, employee_id, month, base_salary, bonus, overtime_hours, overtime_pay, deductions, net_salary, notes, payment_date, status, company_id, sync_status, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)`,
            [tempId, employee_id, month, base_salary, bonus, overtime_hours, overtime_pay, deductions, net_salary, data.notes || '', payment_date, status, companyId]
        );
        syncService.syncPendingRecords('salary_records', '/salary-records');
        return { success: true, id: result.lastID, global_id: tempId };
    } catch (err) {
        console.error("add-salary-record Error:", err.message);
        return { success: false, message: err.message };
    }
});

// Audit Logs - LOCAL FIRST
ipcMain.handle("get-audit-logs", async (e, companyId) => {
    try {
        const ids = await resolveCompanyIds(companyId);
        return await db.asyncAll("SELECT * FROM audit_logs WHERE company_id = ? OR company_id = ? OR company_id = ? ORDER BY timestamp DESC", [ids.localId, ids.globalId, String(ids.localId)]);
    } catch (err) {
        console.error("get-audit-logs Error:", err.message);
        return [];
    }
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

// Network Status Change - Trigger immediate sync when back online
ipcMain.on("network-status-changed", (event, status) => {
    if (status === 'online') {
        console.log("[NETWORK] System is BACK ONLINE. Triggering immediate background sync...");
        syncService.syncPendingRecords();
    } else {
        console.log("[NETWORK] System went OFFLINE. Sync paused.");
    }
});

// Create window
ipcMain.handle("reset-sync", async (e, companyId) => {
    try {
        const result = await syncService.resetModules(companyId);
        return result;
    } catch (err) {
        console.error("reset-sync Error:", err.message);
        return { success: false, message: err.message };
    }
});

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

    // Trigger initial sync on startup to catch anything left over from previous sessions
    win.once('ready-to-show', () => {
        console.log("[STARTUP] Checking for pending records to sync...");
        syncService.syncPendingRecords();
        if (app.isPackaged) {
            autoUpdater.checkForUpdatesAndNotify();
        }
    });
}

app.whenReady().then(async () => {
    console.log("[STARTUP] Waiting for database initialization...");
    try {
        await db.initPromise;
        console.log("[STARTUP] Database initialized successfully.");
        createWindow();
    } catch (err) {
        console.error("[STARTUP] Database initialization failed:", err);
        // We still create the window so the app doesn't just hang, 
        // but it might have limited functionality if DB is broken.
        createWindow();
    }
});
