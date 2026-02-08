const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('../database/business.db');
const companyId = 'cmkntaqig0005az3m8nkz0s3e';

const query = `
    SELECT p.id, p.name, c.name as category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id OR p.category_id = c.global_id
    WHERE p.company_id = ?
`;

db.all(query, [companyId], (err, rows) => {
    if (err) console.error(err);
    else console.log(`Query returned ${rows.length} rows for company ${companyId}`);
    db.close();
});
