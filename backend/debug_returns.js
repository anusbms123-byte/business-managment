const db = require("./database/db_manager");
const cid = 'cmkntaqig0005az3m8nkz0s3e';

async function checkReturns() {
    db.all(`SELECT id, customer_id, total_amount, date FROM sale_returns WHERE company_id = ?`, [cid], (err, rows) => {
        console.log(`Found ${rows.length} returns for company ${cid}:`);
        rows.forEach(r => console.log(`ID: ${r.id}, Customer: ${r.customer_id}, Amount: ${r.total_amount}, Date: ${r.date}`));

        db.all(`SELECT id, global_id, name FROM customers WHERE company_id = ?`, [cid], (err, customers) => {
            console.log("\nCustomers for this company:");
            customers.forEach(c => console.log(`ID: ${c.id}, Global: ${c.global_id}, Name: ${c.name}`));
            process.exit(0);
        });
    });
}

checkReturns();
