const db = require("./database/db_manager");
const cid = 'cmkntaqig0005az3m8nkz0s3e';
const agha_gid = 'cmlmlt34800016rpaohuc881p';

async function testQuery() {
    const qParams = [239, cid, '239'];
    const companyMatch = `(company_id = ? OR company_id = ? OR company_id = ?)`;

    // Total Returns (No Filter)
    db.get(`SELECT SUM(total_amount) as total FROM sale_returns WHERE ${companyMatch}`, qParams, (err, row) => {
        console.log("Total Returns (No Filter):", row.total);

        // Filtered Returns (Agha G)
        const srSql = `SELECT SUM(total_amount) as total FROM sale_returns WHERE ${companyMatch} AND (customer_id = ? OR customer_id = (SELECT id FROM customers WHERE global_id = ?))`;
        const srP = [...qParams, agha_gid, agha_gid];

        db.get(srSql, srP, (err, row2) => {
            if (err) console.error(err);
            console.log("Filtered Returns (Agha G):", row2.total);
            process.exit(0);
        });
    });
}

testQuery();
