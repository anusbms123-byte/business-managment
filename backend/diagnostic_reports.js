const db = require("./database/db_manager");

async function diagnostic() {
    const dbGet = (sql, p) => new Promise(res => db.get(sql, p, (err, row) => res(row)));
    const dbAll = (sql, p) => new Promise(res => db.all(sql, p, (err, rows) => res(rows || [])));

    console.log("--- Diagnostic Start ---");

    // Check for duplicate products
    const dupProducts = await dbAll(`SELECT global_id, COUNT(*) as c FROM products GROUP BY global_id HAVING c > 1 AND global_id IS NOT NULL`);
    console.log("Duplicate global_ids in products:", dupProducts.length);
    if (dupProducts.length > 0) {
        console.log("First 5 duplicates:", dupProducts.slice(0, 5));
    }

    // Check for duplicate sales
    const dupSales = await dbAll(`SELECT global_id, COUNT(*) as c FROM sales GROUP BY global_id HAVING c > 1 AND global_id IS NOT NULL`);
    console.log("Duplicate global_ids in sales:", dupSales.length);

    // Check problematic queries
    const companyId = 'all'; // We'll try to find a real one
    const companies = await dbAll("SELECT id, global_id FROM companies LIMIT 5");
    console.log("Found companies:", companies);

    if (companies.length > 0) {
        const target = companies[0];
        const cid = target.global_id || target.id;
        console.log("Testing with Company ID:", cid);

        // Simulate companyMatch
        const companyMatch = `(company_id = '${cid}' OR company_id = '${cid}' OR company_id = '${cid}')`;
        const dateFilter = " AND sale_date BETWEEN '2026-02-01 00:00:00' AND '2026-02-14 23:59:59'";

        console.log("Running Sales Query...");
        const sRes = await dbGet(`SELECT SUM(grand_total) as total FROM sales WHERE ${companyMatch} ${dateFilter}`);
        console.log("Sales Total:", sRes?.total);

        console.log("Running COGS Query (Old Syntax)...");
        try {
            const cRes = await dbGet(`SELECT SUM(si.quantity * p.cost_price) as total_cogs
                FROM sale_items si
                JOIN sales s ON si.sale_id = s.id OR si.sale_id = s.global_id
                JOIN products p ON si.product_id = p.id OR si.product_id = p.global_id
                WHERE s.${companyMatch} ${dateFilter.replace(/sale_date/g, 's.sale_date')}`);
            console.log("COGS Total (Old):", cRes?.total_cogs);
        } catch (e) {
            console.log("COGS Query (Old) failed as expected:", e.message);
        }

        console.log("Running COGS Query (Fixed Syntax)...");
        console.log("Running Returns Query...");
        const srRes = await dbGet(`SELECT SUM(total_amount) as total FROM sale_returns WHERE ${companyMatch} ${dateFilter.replace(/sale_date/g, 'date')}`);
        console.log("Sales Returns Total:", srRes?.total);

        console.log("Running Expenses Query...");
        const exRes = await dbGet(`SELECT SUM(amount) as total FROM expenses WHERE ${companyMatch} ${dateFilter.replace(/sale_date/g, 'date')}`);
        console.log("Expenses Total:", exRes?.total);

        console.log("Running Salaries Query...");
        const salRes = await dbGet(`SELECT SUM(net_salary) as total FROM salary_records WHERE ${companyMatch} ${dateFilter.replace(/sale_date/g, 'payment_date')}`);
        console.log("Salaries Total:", salRes?.total);
    }
    process.exit(0);
}

diagnostic();
