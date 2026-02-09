const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { randomUUID } = require('crypto');

const dbPath = path.join(__dirname, 'database', 'business.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Database connection error:', err.message);
        process.exit(1);
    }
    console.log('Connected to the database.');
});

async function testAddPurchase() {
    try {
        // 1. Get a vendor ID (or use a placeholder if none exist)
        const vendor = await new Promise((resolve, reject) => {
            db.get("SELECT id FROM vendors LIMIT 1", (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        const vendorId = vendor ? vendor.id : 'temp-vendor-id'; // If no vendor, use string
        console.log(`Using vendor ID: ${vendorId}`);

        // 2. Prepare mock data
        const purchaseData = {
            vendor_id: vendorId,
            total_amount: 1000,
            paid_amount: 500,
            ref_number: `TEST-REF-${Date.now()}`,
            company_id: 'test_company_id',
            items: [
                {
                    productId: 'test_product_1',
                    quantity: 10,
                    price: 100,
                    total: 1000
                }
            ]
        };

        const { vendor_id, total_amount, paid_amount, ref_number, company_id, items } = purchaseData;
        const tempId = randomUUID();

        // 3. Replicate main.js logic
        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            db.run(
                `INSERT INTO purchases (global_id, vendor_id, total_amount, paid_amount, ref_number, company_id, sync_status, updated_at) 
                 VALUES (?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)`,
                [tempId, vendor_id, total_amount, paid_amount, ref_number, company_id],
                function (err) {
                    if (err) {
                        console.error("Error inserting purchase:", err.message);
                        db.run("ROLLBACK");
                        return;
                    }

                    console.log(`Purchase Inserted. ID: ${this.lastID}`);
                    const purchaseId = this.lastID;

                    // Add items if provided
                    if (items && Array.isArray(items)) {
                        const stmt = db.prepare(`INSERT INTO purchase_items (global_id, purchase_id, product_id, quantity, unit_cost, total_cost) 
                                               VALUES (?, ?, ?, ?, ?, ?)`);

                        // Error handling for prepare
                        if (!stmt) {
                            console.error("Failed to prepare statement for items");
                            db.run("ROLLBACK");
                            return;
                        }

                        try {
                            items.forEach(item => {
                                stmt.run(randomUUID(), tempId, item.productId || item.product_id, item.quantity, item.price || item.unit_cost, item.total || item.total_cost, (runErr) => {
                                    if (runErr) console.error("Item run error:", runErr);
                                });
                            });
                            stmt.finalize();
                        } catch (itemErr) {
                            console.error("Error inserting items:", itemErr);
                            db.run("ROLLBACK");
                            return;
                        }
                    }

                    db.run("COMMIT", (commitErr) => {
                        if (commitErr) {
                            console.error("Commit Error:", commitErr.message);
                            db.run("ROLLBACK");
                            return;
                        }
                        console.log("Success! Purchase transaction committed.");
                    });
                }
            );
        });

    } catch (error) {
        console.error("Unexpected error:", error);
    }
}

testAddPurchase();
