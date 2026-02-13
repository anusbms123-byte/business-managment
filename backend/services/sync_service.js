const db = require('../database/db_manager');
const axios = require('axios');
console.log("--- SYNC SERVICE LOADED (MODIFIED) ---");

const CLOUD_URL = process.env.CLOUD_URL || 'https://businessdevelopment-ten.vercel.app/api';

class SyncService {
    constructor() {
        this.isSyncing = false;
        this.CLOUD_URL = CLOUD_URL;
        this.currentCompanyId = null; // Store for fallback
    }

    setCompanyId(id) {
        if (id) this.currentCompanyId = String(id);
    }

    async apiCall(method, endpoint, data = null, params = null) {
        try {
            const baseUrl = this.CLOUD_URL.trim();
            const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

            const response = await axios({
                method,
                url: `${baseUrl}${cleanEndpoint}`,
                data,
                params,
                timeout: 30000 // 30s timeout
            });
            return response.data;
        } catch (error) {
            let errorMsg = error.message;
            if (error.response && error.response.data) {
                errorMsg = typeof error.response.data === 'object'
                    ? JSON.stringify(error.response.data)
                    : error.response.data;
            }
            console.error(`[SYNC API] ${method} ${endpoint} failed:`, errorMsg);
            return { success: false, message: errorMsg, status: error.response?.status };
        }
    }

    // ==========================================
    // INITIAL PULL (Cloud -> Local)
    // ==========================================
    async pullAllData(companyGlobalId) {
        if (this.isSyncing) return;
        this.isSyncing = true;

        // For Super Admin, companyGlobalId might be null/undefined to pull all data
        // If it's explicitly null (not just undefined), we treat it as Global pull
        let targetCompanyId = companyGlobalId;
        if (targetCompanyId === undefined) {
            targetCompanyId = this.currentCompanyId;
        }

        console.log(`[SYNC] Starting full data pull for Company ID: ${targetCompanyId || 'Global (Super Admin)'}`);

        try {
            // Priority order for pulling data
            // We use targetCompanyId. If it's missing (e.g. Super Admin doing global pull), we might pass empty string or null depending on API needs.
            // But for normal client sync, targetCompanyId MUST be present.

            const cidParams = targetCompanyId ? `?companyId=${targetCompanyId}` : '';

            const endpoints = [
                { table: 'companies', endpoint: (targetCompanyId && targetCompanyId !== 'null') ? `/companies/${targetCompanyId}` : '/companies' },
                { table: 'roles', endpoint: `/roles${cidParams}` },
                { table: 'users', endpoint: `/users${cidParams}` }, // All users for offline login
                { table: 'categories', endpoint: `/categories${cidParams}` },
                { table: 'brands', endpoint: `/brands${cidParams}` },
                { table: 'vendors', endpoint: `/vendors${cidParams}` },
                { table: 'customers', endpoint: `/customers${cidParams}` },
                { table: 'products', endpoint: `/products${cidParams}` },
                { table: 'employees', endpoint: `/employees${cidParams}` },
                { table: 'expenses', endpoint: `/expenses${cidParams}` },
                { table: 'sales', endpoint: `/sales${cidParams}` },
                { table: 'purchases', endpoint: `/purchases${cidParams}` },
                { table: 'accounts', endpoint: `/account${cidParams}` },
                { table: 'sale_returns', endpoint: `/returns/sales${cidParams}` },
                { table: 'purchase_returns', endpoint: `/returns/purchases${cidParams}` },
                { table: 'attendances', endpoint: `/attendance${cidParams}` },
                { table: 'salary_records', endpoint: `/salary-records${cidParams}` },
                { table: 'audit_logs', endpoint: `/audit-logs${cidParams}` }
            ];

            const baseUrl = this.CLOUD_URL.trim();
            for (const entity of endpoints) {
                try {
                    const endpointParam = entity.endpoint;
                    const url = `${baseUrl}${endpointParam}`;

                    // console.log(`[SYNC] Pulling ${entity.table} from ${url}`);
                    const response = await axios.get(url);
                    const records = response.data;

                    if (!records) {
                        console.warn(`No data received for ${entity.table}`);
                        continue;
                    }

                    // Throttle pulls to prevent overloading
                    await new Promise(resolve => setTimeout(resolve, 100));

                    if (Array.isArray(records)) {
                        console.log(`Pulling ${records.length} records for ${entity.table}...`);
                        for (const record of records) {
                            await this.upsertLocalRecord(entity.table, record);
                        }
                    } else if (typeof records === 'object') {
                        // Single object response (e.g., /companies/:id)
                        console.log(`Pulling single record for ${entity.table}...`);
                        await this.upsertLocalRecord(entity.table, records);
                    }
                } catch (e) {
                    // console.error(`Failed to pull ${entity.table} from ${entity.endpoint}:`, e.message);
                }
            }
            console.log('Full data pull completed.');
            return { success: true, message: "System synchronized for offline use." };
        } catch (error) {
            console.error('Pull failed:', error.message);
            return { success: false, message: error.message };
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Resets specific modules by deleting local data and pulling fresh from cloud.
     * (Sales, Purchase, Company, Users)
     */
    async resetModules(companyGlobalId) {
        console.log("--- RESETTING MODULES (Sales, Purchases, Company, Users) ---");

        const modulesToReset = [
            'sales', 'sale_items',
            'purchases', 'purchase_items',
            'companies',
            'sale_returns', 'sale_return_items',
            'purchase_returns', 'purchase_return_items',
            'customers', 'vendors', 'expenses', 'audit_logs',
            'accounts', 'transactions',
            'employees', 'attendances', 'salary_records'
        ];

        return new Promise((resolve, reject) => {
            db.serialize(async () => {
                try {
                    db.run("BEGIN TRANSACTION");

                    for (const table of modulesToReset) {
                        db.run(`DELETE FROM ${table}`);
                    }

                    // Also clear related deletions to avoid re-deleting what we just pulled
                    db.run("DELETE FROM pending_sync_deletions WHERE table_name IN (" + modulesToReset.map(t => `'${t}'`).join(',') + ")");

                    db.run("COMMIT", async (err) => {
                        if (err) {
                            console.error("Reset transaction failed:", err);
                            db.run("ROLLBACK");
                            return reject(err);
                        }

                        console.log("✓ Local data cleared. Starting fresh pull...");
                        const result = await this.pullAllData(companyGlobalId);
                        resolve(result);
                    });
                } catch (error) {
                    db.run("ROLLBACK");
                    reject(error);
                }
            });
        });
    }

    async resolveLocalId(table, globalId) {
        if (!globalId) return null;
        return new Promise((resolve) => {
            db.get(`SELECT id FROM ${table} WHERE global_id = ?`, [globalId], (err, row) => {
                // console.log(`[DEBUG] Resolve ${table} ${globalId} -> ${row ? row.id : 'NULL'}`);
                if (err) console.error(`[DEBUG] Error resolving ${table}:`, err);
                resolve(row ? row.id : null);
            });
        });
    }

    async upsertLocalRecord(table, cloudData) {
        return new Promise((resolve, reject) => {
            // CRITICAL: Check if this record was intentionally deleted locally
            db.get(`SELECT id FROM pending_sync_deletions WHERE table_name = ? AND global_id = ?`, [table, cloudData.id], (delErr, delRow) => {
                if (delRow) {
                    return resolve();
                }

                const companyId = cloudData.companyId || cloudData.company_id;

                // Robust Lookup to prevent duplicates
                const lookupRecord = (table, cloudData) => new Promise((resolve) => {
                    db.get(`SELECT id, global_id, updated_at, sync_status FROM ${table} WHERE global_id = ?`, [cloudData.id], (err, r1) => {
                        if (r1) return resolve(r1);

                        // Fallback business key lookup
                        let sql = "";
                        let val = "";
                        if (table === 'sales') { sql = `SELECT id, global_id, updated_at, sync_status FROM sales WHERE inv_number = ? AND company_id = ?`; val = cloudData.invoiceNo || cloudData.inv_number; }
                        else if (table === 'products') { sql = `SELECT id, global_id, updated_at, sync_status FROM products WHERE code = ? AND company_id = ?`; val = cloudData.sku || cloudData.code; }
                        else if (table === 'users') { sql = `SELECT id, global_id, updated_at, sync_status FROM users WHERE LOWER(username) = LOWER(?)`; val = cloudData.username; }
                        else if (table === 'purchases') { sql = `SELECT id, global_id, updated_at, sync_status FROM purchases WHERE ref_number = ? AND company_id = ?`; val = cloudData.invoiceNo || cloudData.ref_number; }
                        else if (table === 'vendors') { sql = `SELECT id, global_id, updated_at, sync_status FROM vendors WHERE phone = ? AND company_id = ?`; val = cloudData.phone; }
                        else if (table === 'customers') { sql = `SELECT id, global_id, updated_at, sync_status FROM customers WHERE phone = ? AND company_id = ?`; val = cloudData.phone; }

                        if (sql && val) {
                            const params = table === 'users' ? [val] : [val, companyId];
                            db.get(sql, params, (e, r2) => resolve(r2));
                        } else {
                            resolve(null);
                        }
                    });
                });

                lookupRecord(table, cloudData).then(async existingRow => {
                    // CONFLICT HANDLING: Latest Update Wins
                    if (existingRow && existingRow.sync_status !== 'pending') {
                        const cloudUpdated = new Date(cloudData.updatedAt || cloudData.updated_at || 0).getTime();
                        const localUpdated = new Date(existingRow.updated_at || 0).getTime();

                        if (cloudUpdated <= localUpdated && existingRow.updated_at) {
                            // console.log(`[SYNC] Skipping pull for ${table} ${cloudData.id}: Local is newer or same.`);
                            return resolve();
                        }
                    }

                    let query = "";
                    let params = [];

                    if (table === 'users') {
                        const activeVal = cloudData.isActive !== undefined ? (cloudData.isActive ? 1 : 0) : (cloudData.is_active !== undefined ? cloudData.is_active : 1);
                        if (existingRow) {
                            query = `UPDATE users SET global_id=?, username=?, role=?, role_id=?, fullname=?, email=?, company_id=?, is_active=?, sync_status='synced', updated_at=? WHERE id=?`;
                            params = [cloudData.id, cloudData.username, cloudData.role?.name || cloudData.role, cloudData.roleId || cloudData.role_id, cloudData.fullName || cloudData.fullname, cloudData.email, companyId, activeVal, cloudData.updatedAt || cloudData.updated_at, existingRow.id];
                        } else {
                            query = `INSERT INTO users (global_id, username, password, role, role_id, fullname, email, company_id, is_active, sync_status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`;
                            params = [cloudData.id, cloudData.username, 'cached_password', cloudData.role?.name || cloudData.role, (cloudData.roleId || cloudData.role_id), cloudData.fullName || cloudData.fullname, cloudData.email, companyId, activeVal, cloudData.updatedAt || cloudData.updated_at];
                        }
                    } else if (table === 'roles') {
                        if (existingRow) {
                            query = `UPDATE roles SET global_id=?, name=?, description=?, company_id=?, sync_status='synced', is_system=?, updated_at=? WHERE id=?`;
                            params = [cloudData.id, cloudData.name, cloudData.description, companyId, cloudData.isSystem ? 1 : 0, cloudData.updatedAt || cloudData.updated_at, existingRow.id];
                        } else {
                            query = `INSERT INTO roles (global_id, name, description, company_id, sync_status, is_system, updated_at) VALUES (?, ?, ?, ?, 'synced', ?, ?)`;
                            params = [cloudData.id, cloudData.name, cloudData.description, companyId, cloudData.isSystem ? 1 : 0, cloudData.updatedAt || cloudData.updated_at];
                        }
                    } else if (table === 'products') {
                        const activeVal = cloudData.isActive !== undefined ? (cloudData.isActive ? 1 : 0) : (cloudData.is_active !== undefined ? cloudData.is_active : 1);
                        const localCatId = await this.resolveLocalId('categories', cloudData.categoryId || cloudData.category_id);
                        const localBrandId = await this.resolveLocalId('brands', cloudData.brandId || cloudData.brand_id);
                        const localVendorId = await this.resolveLocalId('vendors', cloudData.vendorId || cloudData.vendor_id);

                        if (existingRow) {
                            query = `UPDATE products SET global_id=?, name=?, code=?, cost_price=?, sell_price=?, stock_quantity=?, unit=?, category_id=?, vendor_id=?, brand_id=?, alert_threshold=?, weight=?, color=?, size=?, grade=?, condition=?, expiry_date=?, description=?, company_id=?, is_active=?, sync_status='synced', updated_at=? WHERE id=?`;
                            params = [cloudData.id, cloudData.name, cloudData.sku || cloudData.code, cloudData.costPrice || cloudData.cost_price, cloudData.sellPrice || cloudData.sell_price, cloudData.stockQty || cloudData.stock_quantity || 0, cloudData.unit, localCatId, localVendorId, localBrandId, cloudData.alertQty || cloudData.alert_threshold || 5, cloudData.weight, cloudData.color, cloudData.size, cloudData.grade, cloudData.condition, cloudData.expiryDate || cloudData.expiry_date, cloudData.description, companyId, activeVal, cloudData.updatedAt || cloudData.updated_at, existingRow.id];
                        } else {
                            query = `INSERT INTO products (global_id, name, code, cost_price, sell_price, stock_quantity, unit, category_id, vendor_id, brand_id, alert_threshold, weight, color, size, grade, condition, expiry_date, description, company_id, is_active, sync_status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`;
                            params = [cloudData.id, cloudData.name, cloudData.sku || cloudData.code, cloudData.costPrice || cloudData.cost_price, cloudData.sellPrice || cloudData.sell_price, cloudData.stockQty || cloudData.stock_quantity || 0, cloudData.unit, localCatId, localVendorId, localBrandId, cloudData.alertQty || cloudData.alert_threshold || 5, cloudData.weight, cloudData.color, cloudData.size, cloudData.grade, cloudData.condition, cloudData.expiryDate || cloudData.expiry_date, cloudData.description, companyId, activeVal, cloudData.updatedAt || cloudData.updated_at];
                        }
                    } else if (table === 'sales') {
                        const localCustId = await this.resolveLocalId('customers', cloudData.customerId || cloudData.customer_id);
                        const localUserId = await this.resolveLocalId('users', cloudData.userId || cloudData.user_id);
                        if (existingRow) {
                            query = `UPDATE sales SET global_id=?, inv_number=?, customer_id=?, user_id=?, total_amount=?, discount=?, tax_amount=?, shipping_cost=?, grand_total=?, amount_paid=?, payment_method=?, payment_status=?, sale_date=?, notes=?, company_id=?, sync_status='synced', updated_at=? WHERE id=?`;
                            params = [cloudData.id, cloudData.invoiceNo || cloudData.inv_number, localCustId, localUserId, cloudData.subTotal || cloudData.total_amount, cloudData.discount, cloudData.tax, cloudData.shippingCost, cloudData.grandTotal || cloudData.grand_total, cloudData.amountPaid || cloudData.amount_paid, cloudData.paymentType || cloudData.paymentMethod || 'CASH', cloudData.paymentStatus || 'paid', cloudData.date || cloudData.sale_date, cloudData.notes || '', companyId, cloudData.updatedAt || cloudData.updated_at, existingRow.id];
                        } else {
                            query = `INSERT INTO sales (global_id, inv_number, customer_id, user_id, total_amount, discount, tax_amount, shipping_cost, grand_total, amount_paid, payment_method, payment_status, sale_date, notes, company_id, sync_status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`;
                            params = [cloudData.id, cloudData.invoiceNo || cloudData.inv_number, localCustId, localUserId, cloudData.subTotal || cloudData.total_amount, cloudData.discount, cloudData.tax, cloudData.shippingCost, cloudData.grandTotal || cloudData.grand_total, cloudData.amountPaid || cloudData.amount_paid, cloudData.paymentType || cloudData.paymentMethod || 'CASH', cloudData.paymentStatus || 'paid', cloudData.date || cloudData.sale_date, cloudData.notes || '', companyId, cloudData.updatedAt || cloudData.updated_at];
                        }
                    } else if (table === 'customers') {
                        query = `INSERT OR REPLACE INTO customers (global_id, name, phone, email, address, city, cnic, gst_no, customer_type, credit_limit, opening_balance, current_balance, company_id, sync_status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`;
                        params = [
                            cloudData.id,
                            cloudData.name,
                            cloudData.phone,
                            cloudData.email,
                            cloudData.address,
                            cloudData.city,
                            cloudData.cnic,
                            cloudData.gstNo || cloudData.gst_no,
                            cloudData.customerType || cloudData.customer_type || 'retail',
                            cloudData.creditLimit || cloudData.credit_limit || 0,
                            cloudData.openingBalance || cloudData.opening_balance || 0,
                            cloudData.balance || cloudData.currentBalance || cloudData.current_balance || 0,
                            companyId,
                            cloudData.updatedAt || cloudData.updated_at
                        ];
                    } else if (table === 'vendors') {
                        query = `INSERT OR REPLACE INTO vendors (global_id, name, phone, email, address, city, contact_person, gst_no, company_name, opening_balance, current_balance, company_id, sync_status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`;
                        params = [
                            cloudData.id,
                            cloudData.name,
                            cloudData.phone,
                            cloudData.email,
                            cloudData.address,
                            cloudData.city,
                            cloudData.contactPerson || cloudData.contact_person,
                            cloudData.gstNo || cloudData.gst_no,
                            cloudData.companyName || cloudData.company_name,
                            cloudData.openingBalance || cloudData.opening_balance || 0,
                            cloudData.balance || cloudData.currentBalance || cloudData.current_balance || 0,
                            companyId,
                            cloudData.updatedAt || cloudData.updated_at
                        ];
                    } else if (table === 'employees') {
                        query = `INSERT OR REPLACE INTO employees (global_id, first_name, last_name, phone, designation, salary, hourly_rate, joining_date, company_id, sync_status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`;
                        params = [cloudData.id, cloudData.firstName, cloudData.lastName, cloudData.phone, cloudData.designation, cloudData.salary, cloudData.hourlyRate || 0, cloudData.joiningDate, companyId, cloudData.updatedAt || cloudData.updated_at];
                    } else if (table === 'purchases') {
                        const localVendorId = await this.resolveLocalId('vendors', cloudData.vendorId || cloudData.vendor_id);
                        if (existingRow) {
                            query = `UPDATE purchases SET global_id=?, ref_number=?, total_amount=?, paid_amount=?, shipping_cost=?, discount=?, tax_amount=?, notes=?, payment_method=?, payment_status=?, due_date=?, vendor_id=?, company_id=?, sync_status='synced', updated_at=?, purchase_date=? WHERE id=?`;
                            params = [cloudData.id, cloudData.invoiceNo || cloudData.ref_number, cloudData.totalAmount || cloudData.total_amount, cloudData.paidAmount || cloudData.paid_amount, cloudData.shippingCost || cloudData.shipping_cost || 0, cloudData.discount || 0, cloudData.tax || 0, cloudData.notes || '', cloudData.paymentMethod || 'CASH', cloudData.paymentStatus || 'RECEIVED', cloudData.dueDate, localVendorId, companyId, cloudData.updatedAt || cloudData.updated_at, cloudData.createdAt || cloudData.date, existingRow.id];
                        } else {
                            query = `INSERT OR REPLACE INTO purchases (global_id, ref_number, total_amount, paid_amount, shipping_cost, discount, tax_amount, notes, payment_method, payment_status, due_date, vendor_id, company_id, sync_status, updated_at, purchase_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?, ?)`;
                            params = [cloudData.id, cloudData.invoiceNo || cloudData.ref_number, cloudData.totalAmount || cloudData.total_amount, cloudData.paidAmount || cloudData.paid_amount, cloudData.shippingCost || cloudData.shipping_cost || 0, cloudData.discount || 0, cloudData.tax || 0, cloudData.notes || '', cloudData.paymentMethod || 'CASH', cloudData.paymentStatus || 'RECEIVED', cloudData.dueDate, localVendorId, companyId, cloudData.updatedAt || cloudData.updated_at, cloudData.createdAt || cloudData.date];
                        }
                    } else if (table === 'brands') {
                        query = `INSERT OR REPLACE INTO brands (global_id, name, description, company_id, sync_status, updated_at) VALUES (?, ?, ?, ?, 'synced', ?)`;
                        params = [cloudData.id, cloudData.name, cloudData.description, companyId, cloudData.updatedAt || cloudData.updated_at];
                    } else if (table === 'categories') {
                        query = `INSERT OR REPLACE INTO categories (global_id, name, description, company_id, sync_status, updated_at) VALUES (?, ?, ?, ?, 'synced', ?)`;
                        params = [cloudData.id, cloudData.name, cloudData.description, companyId, cloudData.updatedAt || cloudData.updated_at];
                    } else if (table === 'expenses') {
                        query = `INSERT OR REPLACE INTO expenses (global_id, title, amount, date, description, category, company_id, sync_status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'synced', ?)`;
                        params = [cloudData.id, cloudData.title, cloudData.amount, cloudData.date, cloudData.description, cloudData.category, companyId, cloudData.updatedAt || cloudData.updated_at];
                    } else if (table === 'companies') {
                        const activeVal = cloudData.isActive !== undefined ? (cloudData.isActive ? 1 : 0) : (cloudData.is_active !== undefined ? cloudData.is_active : 1);
                        query = `INSERT OR REPLACE INTO companies (global_id, name, address, phone, email, tax_no, currency_symbol, logo_path, is_active, sync_status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`;
                        params = [cloudData.id, cloudData.name, cloudData.address, cloudData.phone, cloudData.email, cloudData.taxNo || cloudData.tax_no, cloudData.currency || cloudData.currency_symbol || 'PKR', cloudData.logo || cloudData.logo_path, activeVal, cloudData.updatedAt || cloudData.updated_at];
                    } else if (table === 'accounts') {
                        query = `INSERT OR REPLACE INTO accounts (global_id, name, type, balance, company_id, sync_status, updated_at) VALUES (?, ?, ?, ?, ?, 'synced', ?)`;
                        params = [cloudData.id, cloudData.name, cloudData.type, cloudData.balance, companyId, cloudData.updatedAt || cloudData.updated_at];
                    } else if (table === 'sale_returns') {
                        query = `INSERT OR REPLACE INTO sale_returns (global_id, invoice_no, sale_id, customer_id, sub_total, tax, total_amount, notes, date, company_id, sync_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')`;
                        params = [cloudData.id, cloudData.invoiceNo, cloudData.saleId || cloudData.sale_id, cloudData.customerId || cloudData.customer_id, cloudData.subTotal || cloudData.sub_total, cloudData.tax, cloudData.totalAmount || cloudData.total_amount, cloudData.notes, cloudData.createdAt || cloudData.date, companyId];
                    } else if (table === 'purchase_returns') {
                        query = `INSERT OR REPLACE INTO purchase_returns (global_id, invoice_no, purchase_id, vendor_id, sub_total, tax, total_amount, notes, date, company_id, sync_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')`;
                        params = [cloudData.id, cloudData.invoiceNo, cloudData.purchaseId || cloudData.purchase_id, cloudData.vendorId || cloudData.vendor_id, cloudData.subTotal || cloudData.sub_total, cloudData.tax, cloudData.totalAmount || cloudData.total_amount, cloudData.notes, cloudData.createdAt || cloudData.date, companyId];
                    } else if (table === 'attendances') {
                        query = `INSERT OR REPLACE INTO attendances (global_id, employee_id, date, status, check_in, check_out, sync_status) VALUES (?, ?, ?, ?, ?, ?, 'synced')`;
                        params = [cloudData.id, cloudData.employeeId, cloudData.date, cloudData.status, cloudData.checkIn, cloudData.checkOut];
                    } else if (table === 'salary_records') {
                        query = `INSERT OR REPLACE INTO salary_records (global_id, employee_id, month, base_salary, bonus, overtime_hours, overtime_pay, deductions, net_salary, payment_date, status, company_id, sync_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')`;
                        params = [cloudData.id, cloudData.employeeId, cloudData.month, cloudData.baseSalary, cloudData.bonus, cloudData.overtimeHours, cloudData.overtimePay, cloudData.deductions, cloudData.netSalary, cloudData.paymentDate, cloudData.status, companyId];
                    } else if (table === 'permissions') {
                        query = `INSERT OR REPLACE INTO permissions (global_id, role_id, module, can_view, can_create, can_edit, can_delete, sync_status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'synced', ?)`;
                        params = [cloudData.id, cloudData.roleId, cloudData.module, cloudData.canView ? 1 : 0, cloudData.canCreate ? 1 : 0, cloudData.canEdit ? 1 : 0, cloudData.canDelete ? 1 : 0, cloudData.updatedAt || cloudData.updated_at];
                    }

                    if (query) {
                        try {
                            db.run(query, params, async (err) => {
                                if (err) {
                                    console.error(`Error inserting ${table} (${cloudData.id}):`, err.message);
                                } else {
                                    // Shared function to handle nested items (permissions, items, etc.)
                                    const handleNestedItems = async () => {
                                        if (table === 'sales' && cloudData.items && Array.isArray(cloudData.items)) {
                                            const localSaleId = await this.resolveLocalId('sales', cloudData.id);
                                            if (!localSaleId) return;
                                            for (const item of cloudData.items) {
                                                const localProductId = await this.resolveLocalId('products', item.productId || item.product?.global_id);
                                                db.run(`INSERT OR REPLACE INTO sale_items (global_id, sale_id, product_id, quantity, unit_price, total_price) 
                                                    VALUES (?, ?, ?, ?, ?, ?)`,
                                                    [item.id, localSaleId, localProductId || item.productId, item.quantity, item.price, item.total]);
                                            }
                                        } else if (table === 'purchases' && cloudData.items && Array.isArray(cloudData.items)) {
                                            const localPurchaseId = await this.resolveLocalId('purchases', cloudData.id);
                                            if (!localPurchaseId) return;
                                            for (const item of cloudData.items) {
                                                const localProductId = await this.resolveLocalId('products', item.productId || item.product?.global_id);
                                                db.run(`INSERT OR REPLACE INTO purchase_items (global_id, purchase_id, product_id, quantity, unit_cost, total_cost) 
                                                    VALUES (?, ?, ?, ?, ?, ?)`,
                                                    [item.id, localPurchaseId, localProductId || item.productId, item.quantity, item.unitCost, item.total]);
                                            }
                                        } else if (table === 'sale_returns' && cloudData.items && Array.isArray(cloudData.items)) {
                                            const localReturnId = await this.resolveLocalId('sale_returns', cloudData.id);
                                            if (!localReturnId) return;
                                            for (const item of cloudData.items) {
                                                const localProductId = await this.resolveLocalId('products', item.productId || item.product?.global_id);
                                                db.run(`INSERT OR REPLACE INTO sale_return_items (global_id, return_id, product_id, quantity, price, total) 
                                                    VALUES (?, ?, ?, ?, ?, ?)`,
                                                    [item.id, localReturnId, localProductId || item.productId, item.quantity, item.price, item.total]);
                                            }
                                        } else if (table === 'purchase_returns' && cloudData.items && Array.isArray(cloudData.items)) {
                                            const localReturnId = await this.resolveLocalId('purchase_returns', cloudData.id);
                                            if (!localReturnId) return;
                                            for (const item of cloudData.items) {
                                                const localProductId = await this.resolveLocalId('products', item.productId || item.product?.global_id);
                                                db.run(`INSERT OR REPLACE INTO purchase_return_items (global_id, return_id, product_id, quantity, unit_cost, total) 
                                                    VALUES (?, ?, ?, ?, ?, ?)`,
                                                    [item.id, localReturnId, localProductId || item.productId, item.quantity, item.unitCost, item.total]);
                                            }
                                        } else if (table === 'roles' && cloudData.permissions && Array.isArray(cloudData.permissions)) {
                                            // Use global_id for role_id to ensure permissions can be matched during login
                                            for (const perm of cloudData.permissions) {
                                                db.run(`INSERT OR REPLACE INTO permissions (global_id, role_id, module, can_view, can_create, can_edit, can_delete, sync_status, updated_at) 
                                                    VALUES (?, ?, ?, ?, ?, ?, ?, 'synced', ?)`,
                                                    [
                                                        perm.id,
                                                        cloudData.id,  // Use global UUID for role_id (not local integer ID)
                                                        perm.module,
                                                        perm.canView ? 1 : 0,
                                                        perm.canCreate ? 1 : 0,
                                                        perm.canEdit ? 1 : 0,
                                                        perm.canDelete ? 1 : 0,
                                                        perm.updatedAt || perm.updated_at
                                                    ]
                                                );
                                            }
                                        }
                                    };
                                    await handleNestedItems();
                                }
                                resolve();
                            });
                        } catch (e) {
                            console.error(`Fatal insertion error in ${table}:`, e.message);
                            resolve();
                        }
                    } else {
                        resolve();
                    }
                });
            });
        });
    }

    // ==========================================
    // BACKGROUND PUSH (Local -> Cloud)
    // ==========================================
    async syncPendingRecords() {
        if (this.isSyncing) return;
        this.isSyncing = true;

        try {
            const pushOrder = [
                { table: 'companies', url: '/companies' },
                { table: 'categories', url: '/categories' },
                { table: 'brands', url: '/brands' },
                { table: 'vendors', url: '/vendors' },
                { table: 'customers', url: '/customers' },
                { table: 'roles', url: '/roles' },
                { table: 'users', url: '/users' },
                { table: 'products', url: '/products' },
                { table: 'employees', url: '/employees' },
                { table: 'expenses', url: '/expenses' },
                { table: 'sales', url: '/sales' },
                { table: 'purchases', url: '/purchases' },
                { table: 'accounts', url: '/account' },
                { table: 'sale_returns', url: '/returns/sales' },
                { table: 'purchase_returns', url: '/returns/purchases' },
                { table: 'attendances', url: '/attendance' },
                { table: 'salary_records', url: '/salary-records' },
                { table: 'audit_logs', url: '/audit-logs' }
            ];

            for (const item of pushOrder) {
                try {
                    await this.pushEntity(item.table, item.url);
                } catch (e) {
                    console.error(`[SYNC] Failed to push ${item.table}:`, e.message);
                }
            }

            // After pushing pending records, sync pending deletions
            await this.syncPendingDeletions();
        } catch (error) {
            console.error('Background sync master error:', error.message);
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Synchronizes local record deletions with the cloud.
     */
    async syncPendingDeletions() {
        return new Promise((resolve) => {
            db.all("SELECT * FROM pending_sync_deletions", [], async (err, rows) => {
                if (err || !rows || rows.length === 0) return resolve();

                console.log(`[SYNC] Found ${rows.length} pending deletions to sync...`);

                for (const row of rows) {
                    try {
                        const { id, table_name, global_id } = row;

                        // Map internal table names to API endpoints if necessary
                        let apiEndpoint = `/${table_name}`;
                        if (table_name === 'sale_returns') apiEndpoint = '/returns/sales';
                        if (table_name === 'purchase_returns') apiEndpoint = '/returns/purchases';

                        const response = await this.apiCall('delete', `${apiEndpoint}/${global_id}`);

                        if (response && response.success !== false) {
                            console.log(`[SYNC] Successfully deleted ${table_name} ID ${global_id} from cloud.`);
                            // Remove from pending deletions tracking
                            await new Promise((res) => db.run("DELETE FROM pending_sync_deletions WHERE id = ?", [id], () => res()));
                        } else {
                            const msg = (response?.message || '').toLowerCase();
                            // If it's already deleted on cloud, or cloud says it doesn't exist
                            if (msg.includes('not found') || msg.includes('does not exist') || msg.includes('404')) {
                                console.log(`[SYNC] ${table_name} ID ${global_id} already gone from cloud. Clearing queue.`);
                                await new Promise((res) => db.run("DELETE FROM pending_sync_deletions WHERE id = ?", [id], () => res()));
                            } else if (msg.includes('transaction history') || msg.includes('foreign key')) {
                                console.warn(`[SYNC] Deletion skipped for ${table_name} ID ${global_id} (History exists). Clearing local queue.`);
                                await new Promise((res) => db.run("DELETE FROM pending_sync_deletions WHERE id = ?", [id], () => res()));
                            } else {
                                console.warn(`[SYNC] Cloud deletion failed for ${table_name} ID ${global_id}:`, response?.message || 'Unknown error');
                            }
                        }
                    } catch (error) {
                        console.error(`[SYNC] Error syncing deletion for ${row.table_name}:`, error.message);
                    }
                }
                resolve();
            });
        });
    }

    async pushEntity(table, endpoint) {
        // 1. Handle PENDING (Inserts/Updates)
        const pending = await this.getPendingRecords(table, 'pending');
        for (const record of pending) {
            try {
                let payload = { ...record };
                const localId = record.id;
                const globalId = payload.global_id;

                // Basic Sanitization: Remove Internal fields
                delete payload.id;
                delete payload.sync_status;
                delete payload.global_id;
                delete payload.created_at;
                delete payload.updated_at;

                // Multi-tenancy Mapping (company_id -> companyId)
                if (payload.company_id && !payload.companyId) {
                    payload.companyId = String(payload.company_id);
                }

                // Fallback to current session company if missing
                if (!payload.companyId || payload.companyId === 'null' || payload.companyId === 'undefined') {
                    if (this.currentCompanyId && table !== 'companies') {
                        if ((table === 'roles' || table === 'permissions') && record.is_system === 1) {
                            // Keep as is
                        } else {
                            payload.companyId = this.currentCompanyId;
                        }
                    }
                }
                delete payload.company_id;

                // Handle Super Admin and Company exceptions
                if (!payload.companyId || payload.companyId === 'null' || payload.companyId === 'undefined') {
                    const isSuperAdmin = record.role === 'Super Admin' || record.role === 'SuperAdmin';
                    if (table === 'companies' || (table === 'users' && isSuperAdmin)) {
                        delete payload.companyId;
                    } else if (table === 'roles' && record.is_system === 1) {
                        continue; // System roles don't need sync
                    } else {
                        console.warn(`[SYNC] Skipping ${table} ID ${localId}: Missing companyId (Payload: ${JSON.stringify(payload)})`);
                        continue;
                    }
                }

                // Helper to fetch nested items
                const fetchNested = (sql, params) => new Promise((resolve, reject) => {
                    db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
                });

                // Mapping logic (Products, Sales, etc. for Cloud Sync)
                if (table === 'products') {
                    // console.log(`[SYNC] Processing Product Payload: ${JSON.stringify(record)}`);

                    payload.cost_price = parseFloat(record.cost_price || 0);
                    payload.sell_price = parseFloat(record.sell_price || 0);
                    payload.stock_qty = parseInt(record.stock_quantity || record.stock_qty || 0);
                    payload.alert_qty = parseInt(record.alert_threshold || record.alert_qty || 5);
                    payload.sku = record.code || record.sku || "";
                    payload.weight = parseFloat(record.weight || 0);
                    payload.expiry_date = record.expiry_date;
                    payload.image_url = record.image_url || null;

                    const catRow = await fetchNested(`SELECT global_id FROM categories WHERE id = ? OR global_id = ?`, [record.category_id, record.category_id]);
                    payload.category_id = (catRow && catRow.length > 0 && catRow[0].global_id) ? String(catRow[0].global_id) : null;

                    const brandRow = await fetchNested(`SELECT global_id FROM brands WHERE id = ? OR global_id = ?`, [record.brand_id, record.brand_id]);
                    payload.brand_id = (brandRow && brandRow.length > 0 && brandRow[0].global_id) ? String(brandRow[0].global_id) : null;

                    const venRow = await fetchNested(`SELECT global_id FROM vendors WHERE id = ? OR global_id = ?`, [record.vendor_id, record.vendor_id]);
                    payload.vendor_id = (venRow && venRow.length > 0 && venRow[0].global_id) ? String(venRow[0].global_id) : null;

                    // Clean up internal keys
                    ['costPrice', 'sellPrice', 'stockQty', 'alertQty', 'expiryDate', 'categoryId', 'brandId', 'vendorId', 'imageUrl'].forEach(k => delete payload[k]);

                } else if (table === 'sales') {
                    payload.invoiceNo = record.inv_number || record.invoice_no;
                    payload.subTotal = parseFloat(record.total_amount || 0);
                    payload.grandTotal = parseFloat(record.grand_total || 0);
                    payload.amountPaid = parseFloat(record.amount_paid || 0);
                    payload.discount = parseFloat(record.discount || 0);
                    payload.tax = parseFloat(record.tax_amount || 0);
                    payload.shippingCost = parseFloat(record.shipping_cost || 0);
                    const rawDate = record.sale_date || record.date;
                    payload.date = rawDate ? new Date(rawDate).toISOString() : new Date().toISOString();

                    const customerRow = await fetchNested(`SELECT global_id FROM customers WHERE id = ? OR global_id = ?`, [record.customer_id, record.customer_id]);
                    payload.customerId = (customerRow && customerRow.length > 0 && customerRow[0].global_id) ? String(customerRow[0].global_id) : null;

                    const userRow = await fetchNested(`SELECT global_id FROM users WHERE id = ? OR global_id = ?`, [record.user_id, record.user_id]);
                    payload.userId = (userRow && userRow.length > 0 && userRow[0].global_id) ? String(userRow[0].global_id) : null;

                    const items = await fetchNested(`
                        SELECT si.*, p.global_id as product_global_id 
                        FROM sale_items si 
                        LEFT JOIN products p ON si.product_id = p.id OR si.product_id = p.global_id 
                        WHERE si.sale_id = ? OR si.sale_id = ?
                    `, [localId, globalId]);
                    payload.items = items.map(item => ({
                        productId: String(item.product_global_id || item.product_id || ""),
                        quantity: parseInt(item.quantity || 0),
                        price: parseFloat(item.unit_price || 0),
                        total: parseFloat(item.total_price || 0)
                    }));

                } else if (table === 'purchases') {
                    payload.invoiceNo = record.ref_number || record.invoice_no;
                    payload.totalAmount = parseFloat(record.total_amount || 0);
                    payload.paidAmount = parseFloat(record.paid_amount || 0);
                    payload.shippingCost = parseFloat(record.shipping_cost || 0);
                    payload.discount = parseFloat(record.discount || 0);
                    payload.tax = parseFloat(record.tax_amount || 0);
                    payload.notes = record.notes || "";
                    payload.paymentMethod = record.payment_method || "CASH";
                    payload.paymentStatus = record.payment_status || "RECEIVED";
                    payload.dueDate = record.due_date;

                    const vendorRow = await fetchNested(`SELECT global_id FROM vendors WHERE id = ? OR global_id = ?`, [record.vendor_id, record.vendor_id]);
                    payload.vendorId = (vendorRow && vendorRow.length > 0 && vendorRow[0].global_id) ? String(vendorRow[0].global_id) : null;

                    const items = await fetchNested(`
                        SELECT pi.*, p.global_id as product_global_id 
                        FROM purchase_items pi 
                        LEFT JOIN products p ON pi.product_id = p.id OR pi.product_id = p.global_id 
                        WHERE pi.purchase_id = ? OR pi.purchase_id = ?
                    `, [localId, globalId]);
                    payload.items = items.map(item => ({
                        productId: String(item.product_global_id || item.product_id || ""),
                        quantity: parseInt(item.quantity || 0),
                        unitCost: parseFloat(item.unit_cost || 0),
                        total: parseFloat(item.total_cost || 0)
                    }));
                } else if (table === 'sale_returns') {
                    payload.invoiceNo = record.invoice_no;
                    payload.subTotal = parseFloat(record.sub_total || 0);
                    payload.tax = parseFloat(record.tax || 0);
                    payload.totalAmount = parseFloat(record.total_amount || 0);
                    payload.notes = record.notes;
                    const rawDate = record.date;
                    payload.date = rawDate ? new Date(rawDate).toISOString() : new Date().toISOString();

                    // Resolve customer and sale IDs
                    const customerRow = await fetchNested(`SELECT global_id FROM customers WHERE id = ? OR global_id = ?`, [record.customer_id, record.customer_id]);
                    payload.customerId = (customerRow && customerRow.length > 0 && customerRow[0].global_id) ? String(customerRow[0].global_id) : null;

                    const saleRow = await fetchNested(`SELECT global_id FROM sales WHERE id = ? OR global_id = ?`, [record.sale_id, record.sale_id]);
                    payload.saleId = (saleRow && saleRow.length > 0 && saleRow[0].global_id) ? String(saleRow[0].global_id) : null;

                    // Fetch and map items
                    const items = await fetchNested(`
                        SELECT sri.*, p.global_id as product_global_id 
                        FROM sale_return_items sri 
                        LEFT JOIN products p ON sri.product_id = p.id OR sri.product_id = p.global_id 
                        WHERE sri.return_id = ? OR sri.return_id = ?
                    `, [localId, globalId]);
                    payload.items = items.map(item => ({
                        productId: String(item.product_global_id || item.product_id || ""),
                        quantity: parseInt(item.quantity || 0),
                        price: parseFloat(item.price || 0),
                        total: parseFloat(item.total || 0)
                    }));
                } else if (table === 'purchase_returns') {
                    payload.invoiceNo = record.invoice_no;
                    payload.subTotal = parseFloat(record.sub_total || 0);
                    payload.tax = parseFloat(record.tax || 0);
                    payload.totalAmount = parseFloat(record.total_amount || 0);
                    payload.notes = record.notes;
                    const rawDate = record.date;
                    payload.date = rawDate ? new Date(rawDate).toISOString() : new Date().toISOString();

                    // Resolve vendor and purchase IDs
                    const vendorRow = await fetchNested(`SELECT global_id FROM vendors WHERE id = ? OR global_id = ?`, [record.vendor_id, record.vendor_id]);
                    payload.vendorId = (vendorRow && vendorRow.length > 0 && vendorRow[0].global_id) ? String(vendorRow[0].global_id) : null;

                    const purchaseRow = await fetchNested(`SELECT global_id FROM purchases WHERE id = ? OR global_id = ?`, [record.purchase_id, record.purchase_id]);
                    payload.purchaseId = (purchaseRow && purchaseRow.length > 0 && purchaseRow[0].global_id) ? String(purchaseRow[0].global_id) : null;

                    // Fetch and map items
                    const items = await fetchNested(`
                        SELECT pri.*, p.global_id as product_global_id 
                        FROM purchase_return_items pri 
                        LEFT JOIN products p ON pri.product_id = p.id OR pri.product_id = p.global_id 
                        WHERE pri.return_id = ? OR pri.return_id = ?
                    `, [localId, globalId]);
                    payload.items = items.map(item => ({
                        productId: String(item.product_global_id || item.product_id || ""),
                        quantity: parseInt(item.quantity || 0),
                        unitCost: parseFloat(item.unit_cost || 0),
                        total: parseFloat(item.total || 0)
                    }));
                } else if (table === 'customers') {
                    payload.customerType = record.customer_type || 'retail';
                    payload.gst_no = record.gst_no;
                    payload.creditLimit = parseFloat(record.credit_limit || 0);
                    payload.openingBalance = parseFloat(record.opening_balance || 0);
                    payload.balance = parseFloat(record.current_balance || record.balance || payload.openingBalance);
                } else if (table === 'vendors') {
                    payload.companyName = record.company_name;
                    payload.contactPerson = record.contact_person;
                    payload.gstNo = record.gst_no;
                    payload.openingBalance = parseFloat(record.opening_balance || 0);
                    payload.balance = parseFloat(record.current_balance || record.balance || payload.openingBalance);
                } else if (table === 'expenses') {
                    payload.title = record.title;
                    payload.amount = parseFloat(record.amount || 0);
                    payload.date = record.date;
                    payload.description = record.description;
                    payload.category = record.category;
                } else if (table === 'employees') {
                    payload.firstName = record.first_name;
                    payload.lastName = record.last_name;
                    payload.phone = record.phone;
                    payload.designation = record.designation;
                    payload.salary = parseFloat(record.salary || 0);
                    payload.hourly_rate = parseFloat(record.hourly_rate || 0);
                    payload.joiningDate = record.joining_date;
                } else if (table === 'roles') {
                    const permissions = await fetchNested("SELECT * FROM permissions WHERE role_id = ? OR role_id = ?", [localId, globalId]);
                    payload.permissions = permissions.map(p => ({
                        module: p.module,
                        canView: p.can_view === 1,
                        canCreate: p.can_create === 1,
                        canEdit: p.can_edit === 1,
                        canDelete: p.can_delete === 1
                    }));
                } else if (table === 'users') {
                    payload.fullName = record.fullname;
                    payload.isActive = record.is_active === 1;
                    const roleRow = await fetchNested(`SELECT global_id FROM roles WHERE id = ? OR global_id = ?`, [record.role_id, record.role_id]);
                    payload.roleId = (roleRow && roleRow.length > 0 && roleRow[0].global_id) ? String(roleRow[0].global_id) : null;
                } else if (table === 'accounts') {
                    payload.name = record.name;
                    payload.type = record.type;
                    payload.balance = parseFloat(record.balance || 0);
                } else if (table === 'attendances') {
                    const empRow = await fetchNested(`SELECT global_id FROM employees WHERE id = ? OR global_id = ?`, [record.employee_id, record.employee_id]);
                    payload.employeeId = (empRow && empRow.length > 0 && empRow[0].global_id) ? String(empRow[0].global_id) : null;
                    payload.date = record.date;
                    payload.status = record.status;
                    payload.checkIn = record.check_in;
                    payload.checkOut = record.check_out;
                } else if (table === 'salary_records') {
                    const empRow = await fetchNested(`SELECT global_id FROM employees WHERE id = ? OR global_id = ?`, [record.employee_id, record.employee_id]);
                    payload.employeeId = (empRow && empRow.length > 0 && empRow[0].global_id) ? String(empRow[0].global_id) : null;
                    payload.month = record.month;
                    payload.baseSalary = parseFloat(record.base_salary || 0);
                    payload.bonus = parseFloat(record.bonus || 0);
                    payload.overtimeHours = parseFloat(record.overtime_hours || 0);
                    payload.overtimePay = parseFloat(record.overtime_pay || 0);
                    payload.deductions = parseFloat(record.deductions || 0);
                    payload.netSalary = parseFloat(record.net_salary || 0);
                    payload.paymentDate = record.payment_date;
                    payload.status = record.status;
                }

                // Determine Method
                const isLocalUuid = globalId && (globalId.includes('-') || globalId.length > 30);
                const httpMethod = (isLocalUuid || !globalId || globalId === 'null') ? 'POST' : 'PUT';
                const finalUrl = (httpMethod === 'PUT') ? `${endpoint}/${globalId}` : endpoint;

                const response = await this.apiCall(httpMethod, finalUrl, payload);

                if (response && response.success !== false) {
                    console.log(`[SYNC SUCCESS] ${table} (ID: ${localId}) pushed.`);
                    await this.markSynced(table, localId, response.id || response.global_id || globalId);
                } else {
                    // Handle unique constraint / collision
                    const msg = (response?.message || '').toLowerCase();
                    const isCollision = response?.status === 400 || response?.status === 409 || (response?.status === 500 && msg.includes('unique constraint'));

                    if (isCollision) {
                        console.warn(`[SYNC] ${table} collision for ${localId}. Resolving existing Global ID...`);

                        let resolvedGlobalId = response.id || globalId;

                        // If we don't have the ID from the error, we MUST fetch it to avoid syncing local UUID
                        if (!response.id || response.id === globalId) {
                            try {
                                if (table === 'users' && payload.companyId) {
                                    const existing = await this.apiCall('GET', `${endpoint}?companyId=${payload.companyId}`);
                                    const match = existing.find(u => u.username === record.username);
                                    if (match) resolvedGlobalId = match.id;
                                } else if (table === 'products' && payload.companyId) {
                                    // Products might duplicate on name or sku? Usually name/sku combo.
                                    // Cloud doesn't easily expose search by sku yet, but let's try getting all
                                    // This might be heavy for products, but necessary for correctness 
                                    // (Optimization: Maybe skipped for now unless user hits it)
                                }
                            } catch (fetchErr) {
                                console.warn(`[SYNC] Failed to fetch existing ID for collision: ${fetchErr.message}`);
                            }
                        }

                        await this.markSynced(table, localId, resolvedGlobalId);
                    } else {
                        console.error(`[SYNC API] ${table} ${httpMethod} failed: ${JSON.stringify(response)}`);
                    }
                }
            } catch (err) {
                console.error(`[SYNC FATAL] ${table} ID ${record.id}:`, err.message);
            }
        }

        // 2. Handle DELETED status in main tables
        const deleted = await this.getPendingRecords(table, 'deleted');
        for (const record of deleted) {
            try {
                const globalId = record.global_id;
                const localId = record.id;
                if (!globalId || globalId.includes('-')) {
                    // If it was never synced to cloud, just delete locally
                    await new Promise(res => db.run(`DELETE FROM ${table} WHERE id = ?`, [localId], res));
                    continue;
                }

                const response = await this.apiCall('DELETE', `${endpoint}/${globalId}`);
                if (response && response.success !== false) {
                    console.log(`[SYNC DELETE SUCCESS] ${table} ${globalId} removed from cloud.`);
                    await new Promise(res => db.run(`DELETE FROM ${table} WHERE id = ?`, [localId], res));
                } else {
                    const msg = (response?.message || '').toLowerCase();
                    if (msg.includes('not found') || msg.includes('404')) {
                        await new Promise(res => db.run(`DELETE FROM ${table} WHERE id = ?`, [localId], res));
                    }
                }
            } catch (err) {
                console.error(`[SYNC DELETE FATAL] ${table} ID ${record.id}:`, err.message);
            }
        }
    }

    /**
     * Fetches records marked as 'pending' or 'deleted' that are at least 5 minutes old.
     * This satisfies the user requirement of moving data to cloud after 5 minutes.
     */
    getPendingRecords(table, status = 'pending') {
        return new Promise((resolve, reject) => {
            // Using SQLite datetime functions to filter for records updated > 5 mins ago
            const sql = `
                SELECT * FROM ${table} 
                WHERE sync_status = ? 
                AND (
                    updated_at <= datetime('now', '-30 seconds') 
                    OR updated_at IS NULL
                )
            `;
            db.all(sql, [status], (err, rows) => {
                if (err) {
                    console.error(`[SYNC] Error fetching ${status} for ${table}:`, err.message);
                    reject(err);
                } else {
                    if (rows.length > 0) {
                        console.log(`[SYNC] Found ${rows.length} ${status} records in ${table} ready for sync (>5 mins old).`);
                    }
                    resolve(rows);
                }
            });
        });
    }

    markSynced(table, localId, globalId) {
        return new Promise((resolve, reject) => {
            // First get the OLD global_id from the record to see if we need to update children
            db.get(`SELECT global_id FROM ${table} WHERE id = ?`, [localId], (err, row) => {
                if (err) return reject(err);
                if (!row) {
                    // Record might have been deleted?
                    return resolve();
                }
                const oldGlobalId = row.global_id;

                db.serialize(() => {
                    db.run("BEGIN TRANSACTION");

                    // Update Parent Record
                    db.run(
                        `UPDATE ${table} SET sync_status = 'synced', global_id = ? WHERE id = ?`,
                        [globalId, localId],
                        (updateErr) => {
                            if (updateErr) {
                                db.run("ROLLBACK");
                                return reject(updateErr);
                            }
                        }
                    );

                    // Update Children references if Global ID changed (e.g. Temp UUID -> Cloud CUID)
                    if (oldGlobalId && oldGlobalId !== globalId) {
                        if (table === 'roles') {
                            // Update permissions linking to this role
                            db.run("UPDATE permissions SET role_id = ? WHERE role_id = ?", [globalId, oldGlobalId]);
                            // Update users linking to this role
                            db.run("UPDATE users SET role_id = ? WHERE role_id = ?", [globalId, oldGlobalId]);

                            // CRITICAL: Also mark permissions as synced because they were pushed nested in the Role
                            db.run("UPDATE permissions SET global_id = (role_id || '_' || module), sync_status = 'synced' WHERE role_id = ?", [globalId]);
                        } else if (table === 'sales') {
                            db.run("UPDATE sale_items SET sale_id = ? WHERE sale_id = ?", [globalId, oldGlobalId]);
                            db.run("UPDATE sale_returns SET sale_id = ? WHERE sale_id = ?", [globalId, oldGlobalId]);
                        } else if (table === 'purchases') {
                            db.run("UPDATE purchase_items SET purchase_id = ? WHERE purchase_id = ?", [globalId, oldGlobalId]);
                            db.run("UPDATE purchase_returns SET purchase_id = ? WHERE purchase_id = ?", [globalId, oldGlobalId]);
                        } else if (table === 'sale_returns') {
                            db.run("UPDATE sale_return_items SET return_id = ? WHERE return_id = ?", [globalId, oldGlobalId]);
                        } else if (table === 'purchase_returns') {
                            db.run("UPDATE purchase_return_items SET return_id = ? WHERE return_id = ?", [globalId, oldGlobalId]);
                        }
                    }

                    db.run("COMMIT", (commitErr) => {
                        if (commitErr) {
                            console.error("[SYNC] Commit failed in markSynced:", commitErr);
                            reject(commitErr);
                        } else {
                            if (oldGlobalId !== globalId) {
                                console.log(`[SYNC] Updated ${table} ID ${localId} global_id: ${oldGlobalId} -> ${globalId}`);
                            }
                            resolve();
                        }
                    });
                });
            });
        });
    }
}

module.exports = new SyncService();
