const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../database/business.db');
const db = new sqlite3.Database(dbPath);

console.log("Checking database integrity...");

db.serialize(() => {
    console.log("--- Companies ---");
    db.each("SELECT id, name, global_id FROM companies LIMIT 5", (err, row) => {
        console.log(`ID: ${row.id} (Type: ${typeof row.id}) | Name: ${row.name} | Global: ${row.global_id}`);
    });

    console.log("\n--- Users ---");
    db.each("SELECT id, username, company_id, role_id FROM users LIMIT 10", (err, row) => {
        console.log(`User: ${row.username} | Company ID: ${row.company_id} (Type: ${typeof row.company_id}) | Role ID: ${row.role_id}`);
    });

    console.log("\n--- Roles ---");
    db.each("SELECT id, name, company_id FROM roles LIMIT 5", (err, row) => {
        console.log(`Role: ${row.name} | ID: ${row.id} | Company ID: ${row.company_id}`);
    });

    console.log("\n--- Permissions ---");
    db.each("SELECT id, role_id, module FROM permissions LIMIT 5", (err, row) => {
        console.log(`Perm ID: ${row.id} | Role ID: ${row.role_id} (Type: ${typeof row.role_id}) | Module: ${row.module}`);
    });

    console.log("\n--- Products ---");
    db.each("SELECT id, name, category_id, brand_id, vendor_id, company_id FROM products LIMIT 5", (err, row) => {
        console.log(`Prod: ${row.name} | Cat ID: ${row.category_id} | Brand ID: ${row.brand_id} | Vendor ID: ${row.vendor_id} | Comp ID: ${row.company_id}`);
    });

    console.log("\n--- Sales ---");
    db.each("SELECT id, inv_number, customer_id, user_id, company_id FROM sales LIMIT 5", (err, row) => {
        console.log(`Sale: ${row.inv_number} | Cust ID: ${row.customer_id} | User ID: ${row.user_id} | Comp ID: ${row.company_id}`);
    });

    console.log("\n--- Purchases ---");
    db.each("SELECT id, ref_number, vendor_id, company_id FROM purchases LIMIT 5", (err, row) => {
        console.log(`Pur: ${row.ref_number} | Vendor ID: ${row.vendor_id} | Comp ID: ${row.company_id}`);
    });
});

setTimeout(() => { }, 2000); // Wait for async
