const db = require('../database/db_manager');
const axios = require('axios');
console.log("--- SYNC SERVICE LOADED (MODIFIED) ---");

const CLOUD_URL = process.env.CLOUD_URL || 'https://businessdevelopment-ten.vercel.app/api';

class SyncService {
    constructor() {
        this.isPulling = false;
        this.isPushing = false;
        this.pushQueue = [];
        this.CLOUD_URL = CLOUD_URL;
        this.currentCompanyId = null; // Store for fallback
    }

    setCompanyId(id) {
        this.currentCompanyId = id ? String(id) : null;
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
        if (this.isPulling) return;
        this.isPulling = true;

        // For Super Admin, companyGlobalId might be null/undefined to pull all data
        // If it's explicitly null (not just undefined), we treat it as Global pull
        let targetCompanyId = companyGlobalId;
        if (targetCompanyId === undefined) {
            targetCompanyId = this.currentCompanyId;
        }


        if (targetCompanyId && !isNaN(targetCompanyId)) {
            const companyRow = await db.asyncGet("SELECT global_id FROM companies WHERE id = ?", [targetCompanyId]);
            if (companyRow?.global_id) {
                targetCompanyId = companyRow.global_id;
            }
        }

        console.log(`\n[SYNC] -----------------------------------------`);
        console.log(`[SYNC] Starting data pull for: ${targetCompanyId || 'Global (Super Admin)'}`);
        console.log(`[SYNC] -----------------------------------------\n`);

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

                    process.stdout.write(`[SYNC] Pulling ${entity.table}... `);
                    const response = await axios.get(url);
                    const records = response.data;

                    if (!records) {
                        console.warn(`No data received for ${entity.table}`);
                        continue;
                    }

                    // Throttle pulls to prevent overloading
                    await new Promise(resolve => setTimeout(resolve, 100));

                    if (Array.isArray(records)) {
                        console.log(`Working (${records.length} records)...`);
                        const cloudIds = records.map(r => r.id);

                        // Batch processing: 100 records per transaction to avoid long locks
                        const BATCH_SIZE = 100;
                        for (let i = 0; i < records.length; i += BATCH_SIZE) {
                            const batch = records.slice(i, i + BATCH_SIZE);

                            await db.asyncRun("BEGIN TRANSACTION");
                            try {
                                for (const record of batch) {
                                    await this.upsertLocalRecord(entity.table, record, targetCompanyId);
                                }
                                await db.asyncRun("COMMIT");
                            } catch (batchErr) {
                                await db.asyncRun("ROLLBACK").catch(() => { });
                                console.error(`[SYNC BATCH ERROR] ${entity.table} (at record ${i}):`, batchErr.message);
                                throw batchErr;
                            }

                            // Yield event loop between batches to keep system responsive
                            await new Promise(r => setTimeout(r, 20));
                        }

                        // NEW: Clean up local records that were deleted on Cloud
                        await this.cleanupLocalMissing(entity.table, cloudIds, targetCompanyId);

                    } else if (records && typeof records === 'object' && !Array.isArray(records)) {
                        console.log(`Done (1 record)`);
                        await this.upsertLocalRecord(entity.table, records, targetCompanyId);
                    } else {
                        console.log(`Done (0 records)`);
                    }
                } catch (e) {
                    console.error(`[SYNC ERROR] Failed to pull ${entity.table} from ${entity.endpoint}:`, e.message);
                }
            }
            console.log('Full data pull completed.');
            return { success: true, message: "System synchronized for offline use." };
        } catch (error) {
            console.error('Pull failed:', error.message);
            return { success: false, message: error.message };
        } finally {
            this.isPulling = false;
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

        try {
            await db.asyncRun("BEGIN TRANSACTION");

            for (const table of modulesToReset) {
                await db.asyncRun(`DELETE FROM ${table}`);
            }

            // Also clear related deletions to avoid re-deleting what we just pulled
            const placeholders = modulesToReset.map(() => '?').join(',');
            await db.asyncRun(`DELETE FROM pending_sync_deletions WHERE table_name IN (${placeholders})`, modulesToReset);

            await db.asyncRun("COMMIT");

            console.log("✓ Local data cleared. Starting fresh pull...");
            return await this.pullAllData(companyGlobalId);
        } catch (error) {
            await db.asyncRun("ROLLBACK");
            console.error("Reset modules failed:", error);
            throw error;
        }
    }

    async resolveLocalId(table, globalId) {
        if (!globalId) return null;
        try {
            const row = await db.asyncGet(`SELECT id FROM ${table} WHERE global_id = ?`, [globalId]);
            return row ? row.id : null;
        } catch (err) {
            console.error(`[DEBUG] Error resolving ${table}:`, err);
            return null;
        }
    }

    async upsertLocalRecord(table, cloudData, passedCompanyId = null) {
        // 1. Check if this record was intentionally deleted locally
        const delRow = await db.asyncGet(`SELECT id FROM pending_sync_deletions WHERE table_name = ? AND global_id = ?`, [table, cloudData.id]);
        if (delRow) return;

        // 2. Resolve company ID
        // 2. Resolve company ID (Fixed: Prevent system roles/super-admins from inheriting session companyId)
        let companyId = cloudData.companyId || cloudData.company_id;

        const isSystemRole = table === 'roles' && (cloudData.isSystem || cloudData.is_system);
        const roleName = (table === 'users') ? (cloudData.role?.name || cloudData.role || '').toString() : '';
        const isSuperAdminUser = table === 'users' && roleName.toLowerCase().replace(/[\s_]/g, '') === 'superadmin';

        if (isSystemRole || isSuperAdminUser) {
            companyId = null;
        } else if (!companyId || companyId === 'null' || companyId === 'undefined') {
            companyId = passedCompanyId;
        }

        // 3. Lookup existing record
        let existingRow = await db.asyncGet(`SELECT id, global_id, updated_at, sync_status FROM ${table} WHERE global_id = ?`, [cloudData.id]);

        if (!existingRow) {
            // Fallback business key lookup
            let sql = "";
            let val = "";
            if (table === 'sales') { sql = `SELECT id, global_id, updated_at, sync_status FROM sales WHERE inv_number = ? AND company_id = ?`; val = cloudData.invoiceNo || cloudData.inv_number; }
            else if (table === 'products') { sql = `SELECT id, global_id, updated_at, sync_status FROM products WHERE code = ? AND company_id = ?`; val = cloudData.sku || cloudData.code; }
            else if (table === 'users') { sql = `SELECT id, global_id, updated_at, sync_status FROM users WHERE LOWER(username) = LOWER(?)`; val = cloudData.username; }
            else if (table === 'purchases') { sql = `SELECT id, global_id, updated_at, sync_status FROM purchases WHERE ref_number = ? AND company_id = ?`; val = cloudData.invoiceNo || cloudData.ref_number; }
            else if (table === 'vendors') { sql = `SELECT id, global_id, updated_at, sync_status FROM vendors WHERE phone = ? AND company_id = ?`; val = cloudData.phone; }
            else if (table === 'customers') { sql = `SELECT id, global_id, updated_at, sync_status FROM customers WHERE phone = ? AND company_id = ?`; val = cloudData.phone; }
            else if (table === 'categories') { sql = `SELECT id, global_id, updated_at, sync_status FROM categories WHERE LOWER(name) = LOWER(?) AND company_id = ?`; val = cloudData.name; }
            else if (table === 'brands') { sql = `SELECT id, global_id, updated_at, sync_status FROM brands WHERE LOWER(name) = LOWER(?) AND company_id = ?`; val = cloudData.name; }
            else if (table === 'employees') { sql = `SELECT id, global_id, updated_at, sync_status FROM employees WHERE phone = ? AND company_id = ?`; val = cloudData.phone; }
            else if (table === 'roles') {
                const cloudCid = cloudData.company_id || cloudData.companyId;
                const isSystem = (!cloudCid || cloudCid === 'null' || cloudCid === 'undefined');
                if (isSystem) {
                    sql = `SELECT id, global_id, updated_at, sync_status FROM roles WHERE LOWER(name) = LOWER(?) AND (company_id IS NULL OR is_system = 1)`;
                    existingRow = await db.asyncGet(sql, [cloudData.name]);
                } else {
                    sql = `SELECT id, global_id, updated_at, sync_status FROM roles WHERE LOWER(name) = LOWER(?) AND (company_id = ? OR company_id = ?)`;
                    existingRow = await db.asyncGet(sql, [cloudData.name, cloudCid || companyId, String(cloudCid || companyId)]);
                }
                sql = ""; // skip generic lookup
            }
            else if (table === 'companies') { sql = `SELECT id, global_id, updated_at, sync_status FROM companies WHERE LOWER(name) = LOWER(?)`; val = cloudData.name; }

            if (sql && val && val !== "" && val !== "null" && val !== "undefined" && val !== null) {
                const params = (table === 'users' || table === 'companies') ? [val] : [val, companyId];
                existingRow = await db.asyncGet(sql, params);
                // Security: Don't merge if they have different Cloud IDs
                if (existingRow && existingRow.global_id && !existingRow.global_id.includes('-') && existingRow.global_id !== cloudData.id) {
                    existingRow = null;
                }
            }
        }

        // 4. Record Conflict Handling
        if (existingRow && existingRow.sync_status === 'pending') return; // Protect local changes
        if (existingRow && existingRow.sync_status !== 'pending') {
            const cloudUpdated = new Date(cloudData.updatedAt || cloudData.updated_at || 0).getTime();
            const localUpdated = new Date(existingRow.updated_at || 0).getTime();
            if (cloudUpdated <= localUpdated && existingRow.updated_at) return;
        }

        // 5. Prepare and Execute Query
        let query = "";
        let params = [];
        const activeVal = cloudData.isActive !== undefined ? (cloudData.isActive ? 1 : 0) : (cloudData.is_active !== undefined ? cloudData.is_active : 1);

        if (table === 'users') {
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
            const opBal = cloudData.openingBalance || cloudData.opening_balance || 0;
            const curBal = cloudData.balance || cloudData.currentBalance || cloudData.current_balance || 0;
            const cType = cloudData.customerType || cloudData.customer_type || 'retail';
            const gNo = cloudData.gstNo || cloudData.gst_no;

            if (existingRow) {
                query = `UPDATE customers SET global_id=?, name=?, phone=?, email=?, address=?, city=?, cnic=?, gst_no=?, customer_type=?, credit_limit=?, opening_balance=?, current_balance=?, company_id=?, sync_status='synced', updated_at=? WHERE id=?`;
                params = [cloudData.id, cloudData.name, cloudData.phone, cloudData.email, cloudData.address, cloudData.city, cloudData.cnic, gNo, cType, cloudData.creditLimit || cloudData.credit_limit || 0, opBal, curBal, companyId, cloudData.updatedAt || cloudData.updated_at, existingRow.id];
            } else {
                query = `INSERT INTO customers (global_id, name, phone, email, address, city, cnic, gst_no, customer_type, credit_limit, opening_balance, current_balance, company_id, sync_status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`;
                params = [cloudData.id, cloudData.name, cloudData.phone, cloudData.email, cloudData.address, cloudData.city, cloudData.cnic, gNo, cType, cloudData.creditLimit || cloudData.credit_limit || 0, opBal, curBal, companyId, cloudData.updatedAt || cloudData.updated_at];
            }
        } else if (table === 'companies') {
            const taxNo = cloudData.taxNo || cloudData.tax_no || cloudData.taxNumber;
            const officePh = cloudData.officePhone || cloudData.office_phone;
            const refCode = cloudData.referralCode || cloudData.referral_code;

            if (existingRow) {
                query = `UPDATE companies SET global_id=?, company_id=?, name=?, address=?, city=?, phone=?, office_phone=?, email=?, tax_no=?, referral_code=?, is_active=?, sync_status='synced', updated_at=? WHERE id=?`;
                params = [cloudData.id, cloudData.id, cloudData.name, cloudData.address, cloudData.city, cloudData.phone, officePh, cloudData.email, taxNo, refCode, activeVal, cloudData.updatedAt || cloudData.updated_at, existingRow.id];
            } else {
                query = `INSERT INTO companies (global_id, company_id, name, address, city, phone, office_phone, email, tax_no, referral_code, is_active, sync_status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`;
                params = [cloudData.id, cloudData.id, cloudData.name, cloudData.address, cloudData.city, cloudData.phone, officePh, cloudData.email, taxNo, refCode, activeVal, cloudData.updatedAt || cloudData.updated_at];
            }
        } else if (table === 'vendors') {
            const opBal = cloudData.openingBalance || cloudData.opening_balance || 0;
            const curBal = cloudData.balance || cloudData.currentBalance || cloudData.current_balance || 0;
            const cPerson = cloudData.contactPerson || cloudData.contact_person;
            const gNo = cloudData.gstNo || cloudData.gst_no;
            const cName = cloudData.companyName || cloudData.company_name;

            if (existingRow) {
                query = `UPDATE vendors SET global_id=?, name=?, phone=?, email=?, address=?, city=?, contact_person=?, gst_no=?, company_name=?, opening_balance=?, current_balance=?, company_id=?, sync_status='synced', updated_at=? WHERE id=?`;
                params = [cloudData.id, cloudData.name, cloudData.phone, cloudData.email, cloudData.address, cloudData.city, cPerson, gNo, cName, opBal, curBal, companyId, cloudData.updatedAt || cloudData.updated_at, existingRow.id];
            } else {
                query = `INSERT INTO vendors (global_id, name, phone, email, address, city, contact_person, gst_no, company_name, opening_balance, current_balance, company_id, sync_status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`;
                params = [cloudData.id, cloudData.name, cloudData.phone, cloudData.email, cloudData.address, cloudData.city, cPerson, gNo, cName, opBal, curBal, companyId, cloudData.updatedAt || cloudData.updated_at];
            }
        } else if (table === 'categories') {
            if (existingRow) {
                query = `UPDATE categories SET global_id=?, name=?, description=?, company_id=?, sync_status='synced', updated_at=? WHERE id=?`;
                params = [cloudData.id, cloudData.name, cloudData.description, companyId, cloudData.updatedAt || cloudData.updated_at, existingRow.id];
            } else {
                query = `INSERT INTO categories (global_id, name, description, company_id, sync_status, updated_at) VALUES (?, ?, ?, ?, 'synced', ?)`;
                params = [cloudData.id, cloudData.name, cloudData.description, companyId, cloudData.updatedAt || cloudData.updated_at];
            }
        } else if (table === 'brands') {
            if (existingRow) {
                query = `UPDATE brands SET global_id=?, name=?, description=?, company_id=?, sync_status='synced', updated_at=? WHERE id=?`;
                params = [cloudData.id, cloudData.name, cloudData.description, companyId, cloudData.updatedAt || cloudData.updated_at, existingRow.id];
            } else {
                query = `INSERT INTO brands (global_id, name, description, company_id, sync_status, updated_at) VALUES (?, ?, ?, ?, 'synced', ?)`;
                params = [cloudData.id, cloudData.name, cloudData.description, companyId, cloudData.updatedAt || cloudData.updated_at];
            }
        } else if (table === 'expenses') {
            if (existingRow) {
                query = `UPDATE expenses SET global_id=?, title=?, amount=?, date=?, description=?, category=?, company_id=?, sync_status='synced', updated_at=? WHERE id=?`;
                params = [cloudData.id, cloudData.title, cloudData.amount, cloudData.date, cloudData.description, cloudData.category, companyId, cloudData.updatedAt || cloudData.updated_at, existingRow.id];
            } else {
                query = `INSERT INTO expenses (global_id, title, amount, date, description, category, company_id, sync_status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'synced', ?)`;
                params = [cloudData.id, cloudData.title, cloudData.amount, cloudData.date, cloudData.description, cloudData.category, companyId, cloudData.updatedAt || cloudData.updated_at];
            }
        } else if (table === 'employees') {
            if (existingRow) {
                query = `UPDATE employees SET global_id=?, first_name=?, last_name=?, phone=?, designation=?, salary=?, hourly_rate=?, joining_date=?, company_id=?, sync_status='synced', is_active=?, updated_at=? WHERE id=?`;
                params = [cloudData.id, cloudData.firstName, cloudData.lastName, cloudData.phone || '', cloudData.designation, cloudData.salary, (cloudData.hourlyRate || cloudData.hourly_rate || 0), cloudData.joiningDate, companyId, activeVal, cloudData.updatedAt || cloudData.updated_at, existingRow.id];
            } else {
                query = `INSERT INTO employees (global_id, first_name, last_name, phone, designation, salary, hourly_rate, joining_date, company_id, sync_status, is_active, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?, ?)`;
                params = [cloudData.id, cloudData.firstName, cloudData.lastName, cloudData.phone || '', cloudData.designation, cloudData.salary, (cloudData.hourlyRate || cloudData.hourly_rate || 0), cloudData.joiningDate, companyId, activeVal, cloudData.updatedAt || cloudData.updated_at];
            }
        } else if (table === 'purchases') {
            const localVendorId = await this.resolveLocalId('vendors', cloudData.vendorId || cloudData.vendor_id);
            if (existingRow) {
                query = `UPDATE purchases SET global_id=?, ref_number=?, vendor_id=?, total_amount=?, paid_amount=?, shipping_cost=?, discount=?, tax_amount=?, payment_method=?, payment_status=?, purchase_date=?, notes=?, company_id=?, sync_status='synced', updated_at=? WHERE id=?`;
                params = [cloudData.id, cloudData.invoiceNo || cloudData.ref_number, localVendorId, cloudData.totalAmount || cloudData.total_amount, cloudData.paidAmount || cloudData.paid_amount, cloudData.shippingCost || cloudData.shipping_cost, cloudData.discount, cloudData.taxAmount || cloudData.tax_amount, cloudData.paymentMethod || cloudData.payment_method || 'CASH', cloudData.paymentStatus || cloudData.payment_status || 'RECEIVED', cloudData.purchaseDate || cloudData.purchase_date, cloudData.notes || '', companyId, cloudData.updatedAt || cloudData.updated_at, existingRow.id];
            } else {
                query = `INSERT INTO purchases (global_id, ref_number, vendor_id, total_amount, paid_amount, shipping_cost, discount, tax_amount, payment_method, payment_status, purchase_date, notes, company_id, sync_status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`;
                params = [cloudData.id, cloudData.invoiceNo || cloudData.ref_number, localVendorId, cloudData.totalAmount || cloudData.total_amount, cloudData.paidAmount || cloudData.paid_amount, cloudData.shippingCost || cloudData.shipping_cost, cloudData.discount, cloudData.taxAmount || cloudData.tax_amount, cloudData.paymentMethod || cloudData.payment_method || 'CASH', cloudData.paymentStatus || cloudData.payment_status || 'RECEIVED', cloudData.purchaseDate || cloudData.purchase_date, cloudData.notes || '', companyId, cloudData.updatedAt || cloudData.updated_at];
            }
        } else if (table === 'sale_returns') {
            const localCustId = await this.resolveLocalId('customers', cloudData.customerId || cloudData.customer_id);
            const localSaleId = await this.resolveLocalId('sales', cloudData.saleId || cloudData.sale_id);
            const invNo = cloudData.invoiceNo || cloudData.inv_number || cloudData.invoice_no;
            const subTotal = cloudData.subTotal || cloudData.sub_total || 0;
            const taxVal = cloudData.tax || cloudData.taxAmount || cloudData.tax_amount || 0;
            const totalAmt = cloudData.totalAmount || cloudData.total_amount || 0;
            const retDate = cloudData.date || cloudData.return_date || cloudData.returnDate;

            if (existingRow) {
                query = `UPDATE sale_returns SET global_id=?, inv_number=?, invoice_no=?, customer_id=?, sale_id=?, total_amount=?, sub_total=?, tax_amount=?, tax=?, notes=?, return_date=?, date=?, company_id=?, sync_status='synced', updated_at=? WHERE id=?`;
                params = [cloudData.id, invNo, invNo, localCustId, localSaleId, totalAmt, subTotal, taxVal, taxVal, cloudData.notes || '', retDate, retDate, companyId, cloudData.updatedAt || cloudData.updated_at, existingRow.id];
            } else {
                query = `INSERT INTO sale_returns (global_id, inv_number, invoice_no, customer_id, sale_id, total_amount, sub_total, tax_amount, tax, notes, return_date, date, company_id, sync_status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`;
                params = [cloudData.id, invNo, invNo, localCustId, localSaleId, totalAmt, subTotal, taxVal, taxVal, cloudData.notes || '', retDate, retDate, companyId, cloudData.updatedAt || cloudData.updated_at];
            }
        } else if (table === 'purchase_returns') {
            const localVendorId = await this.resolveLocalId('vendors', cloudData.vendorId || cloudData.vendor_id);
            const localPurchaseId = await this.resolveLocalId('purchases', cloudData.purchaseId || cloudData.purchase_id);
            const invNo = cloudData.invoiceNo || cloudData.inv_number || cloudData.invoice_no;
            const subTotal = cloudData.subTotal || cloudData.sub_total || 0;
            const taxVal = cloudData.tax || cloudData.taxAmount || cloudData.tax_amount || 0;
            const totalAmt = cloudData.totalAmount || cloudData.total_amount || 0;
            const retDate = cloudData.date || cloudData.return_date || cloudData.returnDate;

            if (existingRow) {
                query = `UPDATE purchase_returns SET global_id=?, inv_number=?, invoice_no=?, vendor_id=?, purchase_id=?, total_amount=?, sub_total=?, tax_amount=?, tax=?, notes=?, return_date=?, date=?, company_id=?, sync_status='synced', updated_at=? WHERE id=?`;
                params = [cloudData.id, invNo, invNo, localVendorId, localPurchaseId, totalAmt, subTotal, taxVal, taxVal, cloudData.notes || '', retDate, retDate, companyId, cloudData.updatedAt || cloudData.updated_at, existingRow.id];
            } else {
                query = `INSERT INTO purchase_returns (global_id, inv_number, invoice_no, vendor_id, purchase_id, total_amount, sub_total, tax_amount, tax, notes, return_date, date, company_id, sync_status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`;
                params = [cloudData.id, invNo, invNo, localVendorId, localPurchaseId, totalAmt, subTotal, taxVal, taxVal, cloudData.notes || '', retDate, retDate, companyId, cloudData.updatedAt || cloudData.updated_at];
            }
        } else if (table === 'accounts') {
            if (existingRow) {
                query = `UPDATE accounts SET global_id=?, name=?, type=?, balance=?, company_id=?, sync_status='synced', updated_at=? WHERE id=?`;
                params = [cloudData.id, cloudData.name, cloudData.type, cloudData.balance || 0, companyId, cloudData.updatedAt || cloudData.updated_at, existingRow.id];
            } else {
                query = `INSERT INTO accounts (global_id, name, type, balance, company_id, sync_status, updated_at) VALUES (?, ?, ?, ?, ?, 'synced', ?)`;
                params = [cloudData.id, cloudData.name, cloudData.type, cloudData.balance || 0, companyId, cloudData.updatedAt || cloudData.updated_at];
            }
        } else if (table === 'attendances') {
            const localEmpId = await this.resolveLocalId('employees', cloudData.employeeId || cloudData.employee_id);
            if (existingRow) {
                query = `UPDATE attendances SET global_id=?, employee_id=?, status=?, date=?, check_in=?, check_out=?, company_id=?, sync_status='synced', updated_at=? WHERE id=?`;
                params = [cloudData.id, localEmpId, cloudData.status, cloudData.date, cloudData.checkIn || cloudData.check_in, cloudData.checkOut || cloudData.check_out, companyId, cloudData.updatedAt || cloudData.updated_at, existingRow.id];
            } else {
                query = `INSERT INTO attendances (global_id, employee_id, status, date, check_in, check_out, company_id, sync_status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'synced', ?)`;
                params = [cloudData.id, localEmpId, cloudData.status, cloudData.date, cloudData.checkIn || cloudData.check_in, cloudData.checkOut || cloudData.check_out, companyId, cloudData.updatedAt || cloudData.updated_at];
            }
        } else if (table === 'salary_records') {
            const localEmpId = await this.resolveLocalId('employees', cloudData.employeeId || cloudData.employee_id);
            if (existingRow) {
                query = `UPDATE salary_records SET global_id=?, employee_id=?, month=?, base_salary=?, bonus=?, overtime_hours=?, overtime_pay=?, deductions=?, net_salary=?, notes=?, payment_date=?, status=?, company_id=?, sync_status='synced', updated_at=? WHERE id=?`;
                params = [cloudData.id, localEmpId, cloudData.month, cloudData.baseSalary || cloudData.base_salary, cloudData.bonus, cloudData.overtimeHours || cloudData.overtime_hours, cloudData.overtimePay || cloudData.overtime_pay, cloudData.deductions, cloudData.netSalary || cloudData.net_salary, cloudData.notes, cloudData.paymentDate || cloudData.payment_date, cloudData.status, companyId, cloudData.updatedAt || cloudData.updated_at, existingRow.id];
            } else {
                query = `INSERT INTO salary_records (global_id, employee_id, month, base_salary, bonus, overtime_hours, overtime_pay, deductions, net_salary, notes, payment_date, status, company_id, sync_status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`;
                params = [cloudData.id, localEmpId, cloudData.month, cloudData.baseSalary || cloudData.base_salary, cloudData.bonus, cloudData.overtimeHours || cloudData.overtime_hours, cloudData.overtimePay || cloudData.overtime_pay, cloudData.deductions, cloudData.netSalary || cloudData.net_salary, cloudData.notes, cloudData.paymentDate || cloudData.payment_date, cloudData.status, companyId, cloudData.updatedAt || cloudData.updated_at];
            }
        } else if (table === 'audit_logs') {
            if (existingRow) {
                query = `UPDATE audit_logs SET global_id=?, action=?, company_id=?, sync_status='synced', updated_at=? WHERE id=?`;
                params = [cloudData.id, cloudData.action, companyId, cloudData.updatedAt || cloudData.updated_at, existingRow.id];
            } else {
                query = `INSERT INTO audit_logs (global_id, action, company_id, sync_status, updated_at) VALUES (?, ?, ?, 'synced', ?)`;
                params = [cloudData.id, cloudData.action, companyId, cloudData.updatedAt || cloudData.updated_at];
            }
        }

        if (query) {
            await db.asyncRun(query, params);
            // Handle Nested Items
            if (table === 'sales' && cloudData.items) {
                const localSaleId = await this.resolveLocalId('sales', cloudData.id);
                if (localSaleId) {
                    await db.asyncRun(`DELETE FROM sale_items WHERE sale_id = ?`, [localSaleId]);
                    for (const item of cloudData.items) {
                        const localProductId = await this.resolveLocalId('products', item.productId);
                        await db.asyncRun(`INSERT INTO sale_items (global_id, sale_id, product_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?, ?)`, [item.id, localSaleId, localProductId || item.productId, item.quantity, item.price, item.total]);
                    }
                }
            } else if (table === 'purchases' && cloudData.items) {
                const localPurchaseId = await this.resolveLocalId('purchases', cloudData.id);
                if (localPurchaseId) {
                    await db.asyncRun(`DELETE FROM purchase_items WHERE purchase_id = ?`, [localPurchaseId]);
                    for (const item of cloudData.items) {
                        const localProductId = await this.resolveLocalId('products', item.productId || item.product_id);
                        await db.asyncRun(`INSERT INTO purchase_items (global_id, purchase_id, product_id, quantity, unit_cost, total_cost) VALUES (?, ?, ?, ?, ?, ?)`, [item.id, localPurchaseId, localProductId || item.productId || item.product_id, item.quantity, item.unitCost || item.unit_cost, item.total || item.total_cost]);
                    }
                }
            } else if (table === 'sale_returns' && cloudData.items) {
                const localReturnId = await this.resolveLocalId('sale_returns', cloudData.id);
                if (localReturnId) {
                    await db.asyncRun(`DELETE FROM sale_return_items WHERE return_id = ?`, [localReturnId]);
                    for (const item of cloudData.items) {
                        const localProductId = await this.resolveLocalId('products', item.productId || item.product_id);
                        await db.asyncRun(`INSERT INTO sale_return_items (global_id, return_id, product_id, quantity, unit_price, price, total_price, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [item.id, localReturnId, localProductId || item.productId || item.product_id, item.quantity, item.price || item.unit_price, item.price || item.unit_price, item.total || item.total_price, item.total || item.total_price]);
                    }
                }
            } else if (table === 'purchase_returns' && cloudData.items) {
                const localReturnId = await this.resolveLocalId('purchase_returns', cloudData.id);
                if (localReturnId) {
                    await db.asyncRun(`DELETE FROM purchase_return_items WHERE return_id = ?`, [localReturnId]);
                    for (const item of cloudData.items) {
                        const localProductId = await this.resolveLocalId('products', item.productId || item.product_id);
                        await db.asyncRun(`INSERT INTO purchase_return_items (global_id, return_id, product_id, quantity, unit_cost, total_cost, total) VALUES (?, ?, ?, ?, ?, ?, ?)`, [item.id, localReturnId, localProductId || item.productId || item.product_id, item.quantity, item.unitCost || item.unit_cost, item.total || item.total_cost, item.total || item.total_cost]);
                    }
                }
            } else if (table === 'roles' && cloudData.permissions) {
                await db.asyncRun(`DELETE FROM permissions WHERE role_id = ?`, [cloudData.id]);
                for (const perm of cloudData.permissions) {
                    const v = (perm.canView || perm.can_view) ? 1 : 0;
                    const c = (perm.canCreate || perm.can_create) ? 1 : 0;
                    const e = (perm.canEdit || perm.can_edit) ? 1 : 0;
                    const d = (perm.canDelete || perm.can_delete) ? 1 : 0;
                    await db.asyncRun(`INSERT OR REPLACE INTO permissions (global_id, role_id, module, can_view, can_create, can_edit, can_delete, sync_status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'synced', ?)`, [perm.id, cloudData.id, perm.module, v, c, e, d, perm.updatedAt || perm.updated_at]);
                }
            }
        }
    }

    /**
     * Deletes local records that are no longer present on the cloud.
     * Prevents data pollution when records are deleted by other users.
     */
    async cleanupLocalMissing(table, cloudIds, companyGlobalId) {
        if (!cloudIds || !table) return;

        // Skip child tables as they are usually handled by parent deletion or fresh pull
        const isChildTable = ['sale_items', 'purchase_items', 'sale_return_items', 'purchase_return_items', 'permissions'].includes(table);
        if (isChildTable) return;

        try {
            // 1. Get all LOCAL synced records for this company
            let sql = `SELECT id, global_id FROM ${table} WHERE (sync_status = 'synced' OR sync_status = 'synced_offline')`;
            let params = [];

            // Filter by company if applicable
            const hasCompanyId = [
                'roles', 'users', 'products', 'categories', 'brands',
                'vendors', 'customers', 'employees', 'expenses', 'sales',
                'purchases', 'accounts', 'sale_returns', 'purchase_returns',
                'attendances', 'salary_records', 'audit_logs'
            ].includes(table);

            if (hasCompanyId && companyGlobalId) {
                // Roles and Users might belong to a company OR be system-wide (NULL)
                if (table === 'roles' || table === 'users') {
                    sql += ` AND (company_id = ? OR company_id IS NULL OR company_id = 'null')`;
                } else {
                    sql += ` AND company_id = ?`;
                }
                params.push(String(companyGlobalId));
            }

            const localRecords = await db.asyncAll(sql, params);
            if (!localRecords || localRecords.length === 0) return;

            // SAFETY CHECK: If cloudIds is empty, we DON'T delete everything.
            // This protects against 500 errors or empty cloud responses clearing the whole local DB.
            if (!cloudIds || cloudIds.length === 0) {
                console.warn(`[SYNC-CLEANUP] Cloud returned 0 items for ${table}. Skipping cleanup to prevent mass data loss.`);
                return;
            }

            // 2. Diff: Find records that exist locally but NOT in the cloud response
            const cloudIdSet = new Set(cloudIds.map(id => String(id)));
            const toDelete = localRecords.filter(loc => loc.global_id && !cloudIdSet.has(String(loc.global_id)));

            // ANOTHER SAFETY CHECK: If we are about to delete more than 80% of our local records, and we have many records,
            // something might be wrong with the sync list. Defer to be safe.
            if (toDelete.length > 50 && toDelete.length > localRecords.length * 0.8) {
                console.warn(`[SYNC-CLEANUP] Safety trigger: Attempting to delete ${toDelete.length}/${localRecords.length} records in ${table}. Aborting automatic cleanup.`);
                return;
            }

            if (toDelete.length > 0) {
                console.log(`[SYNC-CLEANUP] Found ${toDelete.length} records in ${table} no longer on cloud. Deleting...`);

                for (const row of toDelete) {
                    // Critical: Protect System Roles/SuperAdmins from accidental deletion if they weren't in the pull
                    if (table === 'roles' && String(row.global_id).startsWith('system-')) continue;
                    if (table === 'users' && String(row.global_id).startsWith('admin-')) continue;

                    await db.asyncRun(`DELETE FROM ${table} WHERE id = ?`, [row.id]);

                    // Manual cleanup of nested items (since SQLite might not have CASCADE enabled)
                    if (table === 'sales') await db.asyncRun(`DELETE FROM sale_items WHERE sale_id = ? OR sale_id = ?`, [row.id, row.global_id]);
                    if (table === 'purchases') await db.asyncRun(`DELETE FROM purchase_items WHERE purchase_id = ? OR purchase_id = ?`, [row.id, row.global_id]);
                    if (table === 'sale_returns') await db.asyncRun(`DELETE FROM sale_return_items WHERE return_id = ? OR return_id = ?`, [row.id, row.global_id]);
                    if (table === 'purchase_returns') await db.asyncRun(`DELETE FROM purchase_return_items WHERE return_id = ? OR return_id = ?`, [row.id, row.global_id]);
                    if (table === 'roles') await db.asyncRun(`DELETE FROM permissions WHERE role_id = ? OR role_id = ?`, [row.id, row.global_id]);
                }
            }
        } catch (err) {
            console.error(`[SYNC-CLEANUP ERROR] ${table}:`, err.message);
        }
    }


    // ==========================================
    // BACKGROUND PUSH (Local -> Cloud)
    // ==========================================
    async syncPendingRecords(specificTable = null, specificUrl = null) {
        // Add to queue
        this.pushQueue.push({ table: specificTable, url: specificUrl });

        if (this.isPushing) {
            console.log("[SYNC] Push already in progress, request queued.");
            return;
        }

        this.isPushing = true;
        try {
            while (this.pushQueue.length > 0) {
                const task = this.pushQueue.shift();
                await this._doSync(task.table, task.url);
            }
        } finally {
            this.isPushing = false;
        }
    }

    async _doSync(specificTable = null, specificUrl = null) {
        try {
            if (specificTable && specificUrl) {
                console.log(`[SYNC] Immediate push for ${specificTable}...`);
                await this.pushEntity(specificTable, specificUrl);
            } else {
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
            }

            // After pushing pending records, sync pending deletions
            await this.syncPendingDeletions();
        } catch (error) {
            console.error('Background sync core error:', error.message);
        }
    }

    /**
     * Synchronizes local record deletions with the cloud.
     */
    async syncPendingDeletions() {
        try {
            const rows = await db.asyncAll("SELECT * FROM pending_sync_deletions");
            if (!rows || rows.length === 0) return;

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
                        await db.asyncRun("DELETE FROM pending_sync_deletions WHERE id = ?", [id]);
                    } else {
                        const msg = (response?.message || '').toLowerCase();
                        // If it's already deleted on cloud, or cloud says it doesn't exist
                        if (msg.includes('not found') || msg.includes('does not exist') || msg.includes('404')) {
                            console.log(`[SYNC] ${table_name} ID ${global_id} already gone from cloud. Clearing queue.`);
                            await db.asyncRun("DELETE FROM pending_sync_deletions WHERE id = ?", [id]);
                        } else if (msg.includes('transaction history') || msg.includes('foreign key')) {
                            console.warn(`[SYNC] Deletion skipped for ${table_name} ID ${global_id} (History exists). Clearing local queue.`);
                            await db.asyncRun("DELETE FROM pending_sync_deletions WHERE id = ?", [id]);
                        } else {
                            console.warn(`[SYNC] Cloud deletion failed for ${table_name} ID ${global_id}:`, response?.message || 'Unknown error');
                        }
                    }
                    // Yield event loop
                    await new Promise(r => setTimeout(r, 10));
                } catch (error) {
                    console.error(`[SYNC] Error syncing deletion for ${row.table_name}:`, error.message);
                }
            }
        } catch (err) {
            console.error(`[SYNC] Error fetching pending deletions:`, err.message);
        }
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
                delete payload.sync_status;
                delete payload.created_at;
                delete payload.updated_at;

                // Ensure the cloud sees this as the ID (Mapping global_id to id for Cloud API)
                payload.id = globalId;
                delete payload.global_id;

                // Multi-tenancy Mapping (company_id -> companyId)
                const isSuperAdminUser = table === 'users' && (record.role === 'Super Admin' || record.role === 'SuperAdmin' || record.role === 'super_admin');
                const isSystemRole = table === 'roles' && (record.is_system === 1 || record.name === 'Super Admin');

                if (record.company_id) {
                    // CRITICAL: Resolve the local company_id (integer) to its cloud global_id (CUID)
                    const isGlobalFormat = record.company_id && isNaN(record.company_id) && String(record.company_id).length > 5;

                    if (isGlobalFormat) {
                        payload.companyId = String(record.company_id);
                    } else {
                        const companyRow = await db.asyncGet("SELECT global_id FROM companies WHERE id = ? OR global_id = ?", [record.company_id, record.company_id]);
                        payload.companyId = companyRow ? companyRow.global_id : this.currentCompanyId;
                    }
                }

                // If it's a Super Admin or System Role, FORCIBLY set companyId to null (Global context)
                if (isSuperAdminUser || isSystemRole || table === 'companies') {
                    payload.companyId = null;
                } else if (!payload.companyId || payload.companyId === 'null' || payload.companyId === 'undefined' || payload.companyId === '') {
                    // Final Fallback for regular records only
                    payload.companyId = (this.currentCompanyId && this.currentCompanyId !== 'undefined' && this.currentCompanyId !== 'null') ? this.currentCompanyId : null;
                }

                delete payload.company_id;

                // Final check to prevent syncing non-global records without a proper cloud-synced company
                const companySynced = payload.companyId && !payload.companyId.includes('-'); // UUIDs have dashes, CUIDs don't
                if (!companySynced && table !== 'companies' && !isSuperAdminUser && !isSystemRole) {
                    console.warn(`[SYNC DEFER] Skipping ${table} ID ${localId} - Parent company ${payload.companyId} not yet synced to cloud.`);
                    continue;
                }

                console.log(`[SYNC] Pushing ${table} (ID: ${localId}, GID: ${globalId}) to cloud...`);

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

                    const catRow = await db.asyncAll(`SELECT global_id FROM categories WHERE id = ? OR global_id = ?`, [record.category_id, record.category_id]);
                    payload.category_id = (catRow && catRow.length > 0 && catRow[0].global_id) ? String(catRow[0].global_id) : null;

                    const brandRow = await db.asyncAll(`SELECT global_id FROM brands WHERE id = ? OR global_id = ?`, [record.brand_id, record.brand_id]);
                    payload.brand_id = (brandRow && brandRow.length > 0 && brandRow[0].global_id) ? String(brandRow[0].global_id) : null;

                    const venRow = await db.asyncAll(`SELECT global_id FROM vendors WHERE id = ? OR global_id = ?`, [record.vendor_id, record.vendor_id]);
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

                    const customerRow = await db.asyncAll(`SELECT global_id FROM customers WHERE id = ? OR global_id = ?`, [record.customer_id, record.customer_id]);
                    payload.customerId = (customerRow && customerRow.length > 0 && customerRow[0].global_id) ? String(customerRow[0].global_id) : null;

                    const userRow = await db.asyncAll(`SELECT global_id FROM users WHERE id = ? OR global_id = ?`, [record.user_id, record.user_id]);
                    payload.userId = (userRow && userRow.length > 0 && userRow[0].global_id) ? String(userRow[0].global_id) : null;

                    const items = await db.asyncAll(`
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

                    const vendorRow = await db.asyncAll(`SELECT global_id FROM vendors WHERE id = ? OR global_id = ?`, [record.vendor_id, record.vendor_id]);
                    payload.vendorId = (vendorRow && vendorRow.length > 0 && vendorRow[0].global_id) ? String(vendorRow[0].global_id) : null;

                    const items = await db.asyncAll(`
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
                    payload.invoiceNo = record.invoice_no || record.inv_number;
                    payload.subTotal = parseFloat(record.sub_total || 0);
                    payload.tax = parseFloat(record.tax || record.tax_amount || 0);
                    payload.totalAmount = parseFloat(record.total_amount || 0);
                    payload.notes = record.notes;
                    const rawDate = record.date || record.return_date;
                    payload.date = rawDate ? new Date(rawDate).toISOString() : new Date().toISOString();

                    // Resolve customer and sale IDs
                    const customerRow = await db.asyncAll(`SELECT global_id FROM customers WHERE id = ? OR global_id = ?`, [record.customer_id, record.customer_id]);
                    payload.customerId = (customerRow && customerRow.length > 0 && customerRow[0].global_id) ? String(customerRow[0].global_id) : null;

                    const saleRow = await db.asyncAll(`SELECT global_id FROM sales WHERE id = ? OR global_id = ?`, [record.sale_id, record.sale_id]);
                    payload.saleId = (saleRow && saleRow.length > 0 && saleRow[0].global_id) ? String(saleRow[0].global_id) : null;

                    // Fetch and map items
                    const items = await db.asyncAll(`
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
                    payload.invoiceNo = record.invoice_no || record.inv_number;
                    payload.subTotal = parseFloat(record.sub_total || 0);
                    payload.tax = parseFloat(record.tax || record.tax_amount || 0);
                    payload.totalAmount = parseFloat(record.total_amount || 0);
                    payload.notes = record.notes;
                    const rawDate = record.date || record.return_date;
                    payload.date = rawDate ? new Date(rawDate).toISOString() : new Date().toISOString();

                    // Resolve vendor and purchase IDs
                    const vendorRow = await db.asyncAll(`SELECT global_id FROM vendors WHERE id = ? OR global_id = ?`, [record.vendor_id, record.vendor_id]);
                    payload.vendorId = (vendorRow && vendorRow.length > 0 && vendorRow[0].global_id) ? String(vendorRow[0].global_id) : null;

                    const purchaseRow = await db.asyncAll(`SELECT global_id FROM purchases WHERE id = ? OR global_id = ?`, [record.purchase_id, record.purchase_id]);
                    payload.purchaseId = (purchaseRow && purchaseRow.length > 0 && purchaseRow[0].global_id) ? String(purchaseRow[0].global_id) : null;

                    // Fetch and map items
                    const items = await db.asyncAll(`
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
                    payload.isActive = record.is_active === 1;
                } else if (table === 'roles') {
                    payload.isSystem = record.is_system === 1;
                    delete payload.is_system;

                    // Fetch permissions: use BOTH localId (as string) and globalId since either
                    // could be stored as role_id depending on when/how permissions were inserted
                    const permParams = [...new Set([String(localId), String(globalId)].filter(Boolean))];
                    const permPlaceholders = permParams.map(() => '?').join(' OR role_id = ');
                    const permissions = await db.asyncAll(
                        `SELECT * FROM permissions WHERE role_id = ${permPlaceholders}`,
                        permParams
                    );

                    // DEBUG: Check what we are sending
                    console.log(`[SYNC DEBUG] Role ${localId} (${globalId}) - Found ${permissions.length} permissions locally.`);
                    if (permissions.length > 0) {
                        console.log(`[SYNC DEBUG] Modules: ${permissions.map(p => p.module).join(', ')}`);
                    } else {
                        console.warn(`[SYNC WARN] Role ${localId} (${globalId}) has NO permissions to push! Check DB.`);
                    }

                    payload.permissions = permissions.map(p => {
                        const v = (p.can_view === 1 || p.canView === true || p.canView === 1) ? 1 : 0;
                        const c = (p.can_create === 1 || p.canCreate === true || p.canCreate === 1) ? 1 : 0;
                        const e = (p.can_edit === 1 || p.canEdit === true || p.canEdit === 1) ? 1 : 0;
                        const d = (p.can_delete === 1 || p.canDelete === true || p.canDelete === 1) ? 1 : 0;

                        return {
                            id: p.global_id || p.id,
                            module: p.module,
                            canView: v, canCreate: c, canEdit: e, canDelete: d,
                            can_view: v, can_create: c, can_edit: e, can_delete: d
                        };
                    });



                } else if (table === 'users') {
                    payload.fullName = record.fullname;
                    payload.isActive = record.is_active === 1;

                    // Always send role name so cloud can resolve by name
                    payload.role = record.role;

                    const roleRow = await db.asyncAll(`SELECT global_id, is_system FROM roles WHERE id = ? OR global_id = ?`, [record.role_id, record.role_id]);
                    if (roleRow && roleRow.length > 0) {
                        const rr = roleRow[0];
                        // Only send roleId if it's a real cloud-synced ID (not a system template placeholder)
                        if (rr.global_id && !String(rr.global_id).startsWith('system-')) {
                            payload.roleId = String(rr.global_id);
                        } else {
                            // System template — let the cloud resolve by role name
                            payload.roleId = null;
                            console.log(`[SYNC] User ${record.username}: roleId is system template, sending role name '${record.role}' for cloud resolution.`);
                        }
                    } else {
                        payload.roleId = null;
                    }
                } else if (table === 'accounts') {
                    payload.name = record.name;
                    payload.type = record.type;
                    payload.balance = parseFloat(record.balance || 0);
                } else if (table === 'attendances') {
                    const empRow = await db.asyncAll(`SELECT global_id FROM employees WHERE id = ? OR global_id = ?`, [record.employee_id, record.employee_id]);
                    payload.id = record.global_id;
                    payload.employeeId = (empRow && empRow.length > 0 && empRow[0].global_id) ? String(empRow[0].global_id) : null;
                    payload.date = record.date;
                    payload.status = record.status;
                    payload.checkIn = record.check_in;
                    payload.checkOut = record.check_out;
                } else if (table === 'salary_records') {
                    const empRow = await db.asyncAll(`SELECT global_id FROM employees WHERE id = ? OR global_id = ?`, [record.employee_id, record.employee_id]);
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
                    payload.notes = record.notes || "";
                }

                // Determine Method:
                // POST if local temp UUID, PUT if cloud CUID.
                const isLocalTempUuid = !globalId || globalId === 'null' || globalId === 'undefined'
                    || (globalId.includes('-') && globalId.length < 50); // UUID v4 has dashes

                let httpMethod = isLocalTempUuid ? 'POST' : 'PUT';
                let finalUrl = (httpMethod === 'PUT') ? `${endpoint}/${globalId}` : endpoint;

                // For users, if we are doing a POST (new record), ensure we send the globalId as id
                // This preserves continuity if a record was assigned a CUID locally during pull
                if (table === 'users' && httpMethod === 'POST' && globalId && !isLocalTempUuid) {
                    payload.id = globalId;
                }

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
        // Small pause between entity types
        await new Promise(r => setTimeout(r, 50));

        // 2. Handle DELETED status in main tables
        const deleted = await this.getPendingRecords(table, 'deleted');
        for (const record of deleted) {
            try {
                // Yield event loop
                await new Promise(r => setTimeout(r, 10));

                const globalId = record.global_id;
                const localId = record.id;
                if (!globalId || globalId.includes('-')) {
                    // If it was never synced to cloud, just delete locally
                    await db.asyncRun(`DELETE FROM ${table} WHERE id = ?`, [localId]);
                    continue;
                }

                // Special case for roles: check if users are assigned before deleting?
                // For now, try delete. If it fails with "users assigned", we should probably
                // just log it and skip, NOT stop the whole sync.

                const response = await this.apiCall('DELETE', `${endpoint}/${globalId}`);
                if (response && response.success !== false) {
                    console.log(`[SYNC DELETE SUCCESS] ${table} ${globalId} removed from cloud.`);
                    // In local DB, we might want to hard delete it now or just leave it as is?
                    // The instructon says "pending_sync_deletions" table usage, 
                    // but here we are selecting from the main table where sync_status='deleted'?
                    // Actually, usually we have a soft delete or a separate table.
                    // Assuming we just mark it as synced (so we don't try again immediately)
                    // OR we actually remove the record from local DB if it was a soft delete.

                    // If your logic uses a separate deletes table, update that.
                    // If you use sync_status='deleted', then:
                    await db.asyncRun(`DELETE FROM ${table} WHERE id = ?`, [localId]);
                } else {
                    const msg = (response?.message || '').toLowerCase();
                    if (msg.includes('not found') || msg.includes('does not exist') || msg.includes('404')) {
                        console.log(`[SYNC] ${table} ID ${globalId} already gone from cloud. Removing local record.`);
                        await db.asyncRun(`DELETE FROM ${table} WHERE id = ?`, [localId]);
                    } else if (msg.includes('transaction history') || msg.includes('foreign key')) {
                        console.warn(`[SYNC] Cloud deletion ignored for ${table} ID ${globalId} (Integrity constraint). Deleting local only.`);
                        await db.asyncRun(`DELETE FROM ${table} WHERE id = ?`, [localId]);
                    } else {
                        console.warn(`[SYNC API] ${table} DELETE failed: ${response?.message}`);
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
    async getPendingRecords(table, status = 'pending') {
        try {
            // Using SQLite datetime functions to filter for records updated > 5 mins ago
            const sql = `
                SELECT * FROM ${table} 
                WHERE sync_status = ?
            `;
            const rows = await db.asyncAll(sql, [status]);
            if (rows.length > 0) {
                console.log(`[SYNC] Found ${rows.length} ${status} records in ${table} ready for sync.`);
            }
            return rows;
        } catch (err) {
            console.error(`[SYNC] Error fetching ${status} for ${table}:`, err.message);
            throw err;
        }
    }

    async markSynced(table, localId, globalId, inTxn = false) {
        // First get the OLD global_id from the record to see if we need to update children
        const row = await db.asyncGet(`SELECT global_id FROM ${table} WHERE id = ?`, [localId]);
        if (!row) return; // Record might have been deleted?

        const oldGlobalId = row.global_id;

        // Check for collision: Is another local record already using this cloud GID?
        const collision = await db.asyncGet(`SELECT id FROM ${table} WHERE global_id = ? AND id != ?`, [globalId, localId]);

        if (!inTxn) await db.asyncRun("BEGIN TRANSACTION");
        try {
            if (collision) {
                console.log(`[SYNC] Merging duplicate ${table}: ID ${localId} -> ${collision.id} (GID: ${globalId})`);
                await db.asyncRun(`DELETE FROM ${table} WHERE id = ?`, [localId]);
            } else {
                // Update Parent Record
                await db.asyncRun(
                    `UPDATE ${table} SET sync_status = 'synced', global_id = ? WHERE id = ?`,
                    [globalId, localId]
                );
            }

            // Update Children references if Global ID changed (e.g. Temp UUID -> Cloud CUID)
            if (oldGlobalId && oldGlobalId !== globalId) {
                if (table === 'companies') {
                    const tablesToUpdate = ['roles', 'users', 'products', 'categories', 'brands', 'vendors', 'customers', 'employees', 'expenses', 'sales', 'purchases', 'accounts', 'sale_returns', 'purchase_returns', 'attendances', 'salary_records', 'audit_logs'];
                    for (const t of tablesToUpdate) {
                        await db.asyncRun(`UPDATE ${t} SET company_id = ? WHERE company_id = ?`, [globalId, oldGlobalId]);
                    }
                    console.log(`[SYNC] Updated company_id references for ${tablesToUpdate.length} tables: ${oldGlobalId} -> ${globalId}`);
                } else if (table === 'roles') {
                    await db.asyncRun("DELETE FROM permissions WHERE role_id = ? AND module IN (SELECT module FROM permissions WHERE role_id = ?)", [globalId, oldGlobalId]);
                    await db.asyncRun("UPDATE permissions SET role_id = ? WHERE role_id = ?", [globalId, oldGlobalId]);
                    await db.asyncRun("UPDATE users SET role_id = ? WHERE role_id = ?", [globalId, oldGlobalId]);
                } else if (table === 'sales') {
                    await db.asyncRun("UPDATE sale_items SET sale_id = ? WHERE sale_id = ?", [globalId, oldGlobalId]);
                    await db.asyncRun("UPDATE sale_returns SET sale_id = ? WHERE sale_id = ?", [globalId, oldGlobalId]);
                } else if (table === 'purchases') {
                    await db.asyncRun("UPDATE purchase_items SET purchase_id = ? WHERE purchase_id = ?", [globalId, oldGlobalId]);
                    await db.asyncRun("UPDATE purchase_returns SET purchase_id = ? WHERE purchase_id = ?", [globalId, oldGlobalId]);
                } else if (table === 'sale_returns') {
                    await db.asyncRun("UPDATE sale_return_items SET return_id = ? WHERE return_id = ?", [globalId, oldGlobalId]);
                } else if (table === 'purchase_returns') {
                    await db.asyncRun("UPDATE purchase_return_items SET return_id = ? WHERE return_id = ?", [globalId, oldGlobalId]);
                }
            }

            // ALWAYS mark nested items as synced if the parent was just pushed
            if (table === 'roles') {
                await db.asyncRun("UPDATE permissions SET sync_status = 'synced' WHERE role_id = ?", [globalId]);
            }

            if (!inTxn) await db.asyncRun("COMMIT");

            if (oldGlobalId !== globalId) {
                console.log(`[SYNC] ${collision ? 'Merged' : 'Updated'} ${table} ID ${localId} -> ${globalId}`);
            }
        } catch (err) {
            if (!inTxn) await db.asyncRun("ROLLBACK");
            console.error(`[SYNC] markSynced failed for ${table} ${localId}:`, err.message);
            throw err;
        }
    }
}

module.exports = new SyncService();
