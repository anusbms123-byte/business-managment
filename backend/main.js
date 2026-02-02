const { app, BrowserWindow, ipcMain, dialog } = require("electron");

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

// ==========================================
// IPC HANDLERS (PURE CLOUD BRIDGE)
// ==========================================

// Auth
ipcMain.handle("login", (e, credentials) => apiCall('post', '/auth/login', credentials));

// Companies
ipcMain.handle("get-companies", () => apiCall('get', '/companies'));
ipcMain.handle("get-company", (e, id) => apiCall('get', `/companies/${id}`));
ipcMain.handle("create-company", (e, data) => apiCall('post', '/companies', data));
ipcMain.handle("update-company", (e, data) => apiCall('put', `/companies/${data.id}`, data));
ipcMain.handle("delete-company", (e, id) => apiCall('delete', `/companies/${id}`));

// Users
ipcMain.handle("get-users", (e, companyId) => apiCall('get', '/users', null, { companyId }));
ipcMain.handle("create-user", (e, data) => apiCall('post', '/users', data));
ipcMain.handle("update-user", (e, data) => apiCall('put', `/users/${data.id}`, data));
ipcMain.handle("delete-user", (e, id) => apiCall('delete', `/users/${id}`));

// Customers
ipcMain.handle("get-customers", (e, companyId) => apiCall('get', '/customers', null, { companyId }));
ipcMain.handle("create-customer", (e, data) => apiCall('post', '/customers', data));
ipcMain.handle("update-customer", (e, data) => apiCall('put', `/customers/${data.id}`, data));
ipcMain.handle("delete-customer", (e, id) => apiCall('delete', `/customers/${id}`));
ipcMain.handle("delete-sale", (e, id) => apiCall('delete', `/sales/${id}`));

// Vendors (Suppliers)
ipcMain.handle("get-vendors", (e, companyId) => apiCall('get', '/vendors', null, { companyId }));
ipcMain.handle("create-vendor", (e, data) => apiCall('post', '/vendors', data));
ipcMain.handle("update-vendor", (e, data) => apiCall('put', `/vendors/${data.id}`, data));
ipcMain.handle("delete-vendor", (e, id) => apiCall('delete', `/vendors/${id}`));

// Roles & Permissions
ipcMain.handle("get-roles", (e, companyId) => apiCall('get', '/roles', null, { companyId }));
ipcMain.handle("get-permissions", (e, roleId) => apiCall('get', '/permissions', null, { roleId }));
ipcMain.handle("create-role", (e, data) => apiCall('post', '/roles', data));
ipcMain.handle("update-role", (e, data) => apiCall('put', `/roles/${data.id}`, data));
ipcMain.handle("delete-role", (e, id) => apiCall('delete', `/roles/${id}`));

// Inventory
// Inventory - Categories
ipcMain.handle("get-categories", (e, companyId) => apiCall('get', '/categories', null, { companyId }));
ipcMain.handle("create-category", (e, data) => apiCall('post', '/categories', data));
ipcMain.handle("update-category", (e, data) => apiCall('put', `/categories/${data.id}`, data));
ipcMain.handle("delete-category", (e, id) => apiCall('delete', `/categories/${id}`));

// Inventory - Brands
ipcMain.handle("get-brands", (e, companyId) => apiCall('get', '/brands', null, { companyId }));
ipcMain.handle("create-brand", (e, data) => apiCall('post', '/brands', data));
ipcMain.handle("update-brand", (e, data) => apiCall('put', `/brands/${data.id}`, data));
ipcMain.handle("delete-brand", (e, id) => apiCall('delete', `/brands/${id}`));

// Inventory - Products
ipcMain.handle("get-products", (e, companyId) => apiCall('get', '/products', null, { companyId }));
ipcMain.handle("create-product", (e, data) => apiCall('post', '/products', data));
ipcMain.handle("update-product", (e, data) => apiCall('put', `/products/${data.id}`, data));
ipcMain.handle("delete-product", (e, id) => apiCall('delete', `/products/${id}`));

// Sales
ipcMain.handle("get-sales", (e, companyId) => apiCall('get', '/sales', null, { companyId }));
ipcMain.handle("add-sale", (e, data) => apiCall('post', '/sales', data));

// Purchases
ipcMain.handle("get-purchases", (e, companyId) => apiCall('get', '/purchases', null, { companyId }));
ipcMain.handle("add-purchase", (e, data) => apiCall('post', '/purchases', data));
ipcMain.handle("delete-purchase", (e, id) => apiCall('delete', `/purchases/${id}`));

// Expenses
ipcMain.handle("get-expenses", (e, companyId) => apiCall('get', '/expenses', null, { companyId }));
ipcMain.handle("create-expense", (e, data) => apiCall('post', '/expenses', data));
ipcMain.handle("update-expense", (e, data) => apiCall('put', `/expenses/${data.id}`, data));
ipcMain.handle("delete-expense", (e, id) => apiCall('delete', `/expenses/${id}`));

// HRM - Employees
ipcMain.handle("get-employees", (e, companyId) => apiCall('get', '/employees', null, { companyId }));
ipcMain.handle("create-employee", (e, data) => apiCall('post', '/employees', data));
ipcMain.handle("update-employee", (e, data) => apiCall('put', `/employees/${data.id}`, data));
ipcMain.handle("delete-employee", (e, id) => apiCall('delete', `/employees/${id}`));

// HRM - Attendance
ipcMain.handle("get-attendance", (e, params) => apiCall('get', '/attendance', null, params));
ipcMain.handle("save-attendance", (e, data) => apiCall('post', '/attendance', data));

// Reports
ipcMain.handle("get-report-summary", (e, params) => apiCall('get', '/reports/summary', null, params));

// Audit Logs
ipcMain.handle("get-audit-logs", (e, params) => apiCall('get', '/audit-logs', null, params));
ipcMain.handle("create-audit-log", (e, data) => apiCall('post', '/audit-logs', data));

// Sync Trigger (No-op)
ipcMain.handle("trigger-sync", async () => ({ success: true, message: "Apps is now pure cloud" }));

// Create window
function createWindow() {
    console.log("Preload path:", path.join(__dirname, "preload.js"));
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
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
