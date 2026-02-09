// ==========================================
// RETURNS - Sale Returns - LOCAL FIRST
// ==========================================
ipcMain.handle("get-sale-returns", async (e, companyId) => {
    const ids = await resolveCompanyIds(companyId);
    return new Promise((resolve, reject) => {
        const query = `
            SELECT sr.*, c.name as customer_name
            FROM sale_returns sr
            LEFT JOIN customers c ON sr.customer_id = c.id OR sr.customer_id = c.global_id
            WHERE (sr.company_id = ? OR sr.company_id = ? OR sr.company_id = ?) AND (sr.sync_status != 'deleted' OR sr.sync_status IS NULL)
            ORDER BY sr.date DESC
        `;
        db.all(query, [ids.localId, ids.globalId, String(ids.localId)], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
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
                `INSERT INTO sale_returns (global_id, customer_id, sale_id, invoice_no, sub_total, tax, total_amount, notes, company_id, sync_status, date) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)`,
                [tempId, customer_id, sale_id, invoice_no, sub_total, tax, total_amount, notes, companyId],
                function (err) {
                    if (err) {
                        db.run("ROLLBACK");
                        return reject({ success: false, message: err.message });
                    }

                    const returnId = this.lastID;

                    // Add items
                    if (items && Array.isArray(items)) {
                        const stmt = db.prepare(`INSERT INTO sale_return_items (global_id, return_id, product_id, quantity, price, total) 
                                               VALUES (?, ?, ?, ?, ?, ?)`);
                        items.forEach(item => {
                            stmt.run(
                                randomUUID(),
                                tempId,
                                item.productId || item.product_id,
                                item.quantity,
                                item.price || item.unit_price,
                                item.total || (item.quantity * (item.price || item.unit_price || 0))
                            );
                        });
                        stmt.finalize();
                    }

                    db.run("COMMIT", (commitErr) => {
                        if (commitErr) {
                            db.run("ROLLBACK");
                            return reject({ success: false, message: commitErr.message });
                        }
                        syncService.syncPendingRecords();
                        resolve({ success: true, id: returnId, global_id: tempId, message: "Sale return recorded locally." });
                    });
                }
            );
        });
    });
});

ipcMain.handle("delete-sale-return", async (e, id) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT global_id FROM sale_returns WHERE id = ? OR global_id = ?", [id, id], (err, row) => {
            if (err || !row) return reject("Sale return not found");
            const gid = row.global_id;

            db.serialize(() => {
                db.run("BEGIN TRANSACTION");
                db.run("UPDATE sale_returns SET sync_status = 'deleted' WHERE global_id = ?", [gid], (err) => {
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
                        resolve({ success: true, message: "Sale return marked for deletion locally." });
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
            SELECT pr.*, v.name as vendor_name
            FROM purchase_returns pr
            LEFT JOIN vendors v ON pr.vendor_id = v.id OR pr.vendor_id = v.global_id
            WHERE (pr.company_id = ? OR pr.company_id = ? OR pr.company_id = ?) AND (pr.sync_status != 'deleted' OR pr.sync_status IS NULL)
            ORDER BY pr.date DESC
        `;
        db.all(query, [ids.localId, ids.globalId, String(ids.localId)], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
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
                `INSERT INTO purchase_returns (global_id, vendor_id, purchase_id, invoice_no, sub_total, tax, total_amount, notes, company_id, sync_status, date) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)`,
                [tempId, vendor_id, purchase_id, invoice_no, sub_total, tax, total_amount, notes, companyId],
                function (err) {
                    if (err) {
                        db.run("ROLLBACK");
                        return reject({ success: false, message: err.message });
                    }

                    const returnId = this.lastID;

                    // Add items
                    if (items && Array.isArray(items)) {
                        const stmt = db.prepare(`INSERT INTO purchase_return_items (global_id, return_id, product_id, quantity, unit_cost, total) 
                                               VALUES (?, ?, ?, ?, ?, ?)`);
                        items.forEach(item => {
                            stmt.run(
                                randomUUID(),
                                tempId,
                                item.productId || item.product_id,
                                item.quantity,
                                item.unit_cost || item.unitCost || item.price || 0,
                                item.total || (item.quantity * (item.unit_cost || item.unitCost || item.price || 0))
                            );
                        });
                        stmt.finalize();
                    }

                    db.run("COMMIT", (commitErr) => {
                        if (commitErr) {
                            db.run("ROLLBACK");
                            return reject({ success: false, message: commitErr.message });
                        }
                        syncService.syncPendingRecords();
                        resolve({ success: true, id: returnId, global_id: tempId, message: "Purchase return recorded locally." });
                    });
                }
            );
        });
    });
});

ipcMain.handle("delete-purchase-return", async (e, id) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT global_id FROM purchase_returns WHERE id = ? OR global_id = ?", [id, id], (err, row) => {
            if (err || !row) return reject("Purchase return not found");
            const gid = row.global_id;

            db.serialize(() => {
                db.run("BEGIN TRANSACTION");
                db.run("UPDATE purchase_returns SET sync_status = 'deleted' WHERE global_id = ?", [gid], (err) => {
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
                        resolve({ success: true, message: "Purchase return marked for deletion locally." });
                    });
                });
            });
        });
    });
});

