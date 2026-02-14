const db = require("./database/db_manager");
const cid = 'cmkntaqig0005az3m8nkz0s3e';
const agha_gid = 'cmlmlt34800016rpaohuc881p';

async function simulate() {
    const dbGet = (sql, p) => new Promise(res => db.get(sql, p, (err, row) => res(row)));

    // Simulate params
    const customerId = agha_gid;
    const startDate = '2026-02-01'; // Default monthly start
    const endDate = '2026-02-14';

    const ids = { localId: 239, globalId: cid };
    const companyMatch = `(company_id = ? OR company_id = ? OR company_id = ?)`;
    const qParams = [ids.localId, ids.globalId, String(ids.localId)];

    const normalizeDate = (d) => d.replace('T', ' ').split('.')[0].replace('Z', '');
    const startStr = normalizeDate(startDate) + ' 00:00:00';
    const endStr = normalizeDate(endDate) + ' 23:59:59';
    const dateFilter = ` AND date(sale_date) BETWEEN date('${startStr}') AND date('${endStr}')`;

    console.log("--- Simulation ---");

    // 1. Sales
    let salesSql = `SELECT SUM(grand_total) as total FROM sales WHERE ${companyMatch} ${dateFilter}`;
    let salesP = [...qParams];
    salesSql += ` AND (customer_id = ? OR customer_id = (SELECT id FROM customers WHERE global_id = ?))`;
    salesP.push(customerId, customerId);
    const sRow = await dbGet(salesSql, salesP);
    console.log("Stats Total Sales:", sRow.total);

    // 2. Returns
    let srSql = `SELECT SUM(total_amount) as total FROM sale_returns WHERE ${companyMatch} ${dateFilter.replace(/sale_date/g, 'date')}`;
    let srP = [...qParams];
    srSql += ` AND (customer_id = ? OR customer_id = (SELECT id FROM customers WHERE global_id = ?))`;
    srP.push(customerId, customerId);
    const srRow = await dbGet(srSql, srP);
    console.log("Stats Total Returns:", srRow.total);

    // 3. COGS
    let cogsSql = `SELECT SUM(si.quantity * p.cost_price) as total_cogs
        FROM sale_items si
        JOIN sales s ON si.sale_id = s.id OR si.sale_id = s.global_id
        JOIN products p ON si.product_id = p.id OR si.product_id = p.global_id
        WHERE ${companyMatch.replace(/company_id/g, 's.company_id')} ${dateFilter.replace(/sale_date/g, 's.sale_date')}`;
    let cogsP = [...qParams];
    cogsSql += ` AND (s.customer_id = ? OR s.customer_id = (SELECT id FROM customers WHERE global_id = ?))`;
    cogsP.push(customerId, customerId);
    const cRow = await dbGet(cogsSql, cogsP);
    console.log("Stats Total COGS:", cRow.total_cogs);

    const gross = (sRow.total || 0) - (srRow.total || 0) - (cRow.total_cogs || 0);
    console.log("Calculated Gross Profit:", gross);

    process.exit(0);
}

simulate();
