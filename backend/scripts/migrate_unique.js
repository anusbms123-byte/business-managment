const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '../database/business.db');
const db = new sqlite3.Database(dbPath);

const tableSchemas = {
    categories: `CREATE TABLE IF NOT EXISTS categories_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id TEXT,
      global_id TEXT UNIQUE,
      sync_status TEXT DEFAULT 'synced',
      name TEXT NOT NULL,
      description TEXT,
      is_active INTEGER DEFAULT 1
    )`,
    brands: `CREATE TABLE IF NOT EXISTS brands_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id TEXT,
      global_id TEXT UNIQUE,
      sync_status TEXT DEFAULT 'synced',
      name TEXT NOT NULL,
      description TEXT,
      is_active INTEGER DEFAULT 1
    )`,
    products: `CREATE TABLE IF NOT EXISTS products_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id TEXT,
      global_id TEXT UNIQUE,
      sync_status TEXT DEFAULT 'synced',
      name TEXT NOT NULL,
      code TEXT,
      cost_price REAL DEFAULT 0,
      sell_price REAL DEFAULT 0,
      stock_quantity INTEGER DEFAULT 0,
      alert_threshold INTEGER DEFAULT 5,
      image_url TEXT,
      category_id INTEGER,
      vendor_id INTEGER,
      brand_id TEXT,
      unit TEXT DEFAULT 'pcs',
      weight REAL DEFAULT 0,
      expiry_date DATETIME,
      description TEXT,
      color TEXT,
      size TEXT,
      grade TEXT,
      condition TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`
};

async function migrate() {
    console.log("🛠️ Starting Schema Migration to enforce UNIQUE(global_id)...");

    for (const [table, schema] of Object.entries(tableSchemas)) {
        console.log(`Migrating ${table}...`);

        await new Promise((resolve) => {
            db.serialize(() => {
                db.run(`DROP TABLE IF EXISTS ${table}_new`);
                db.run(schema);

                const cols = {
                    categories: 'company_id, global_id, sync_status, name, description, is_active',
                    brands: 'company_id, global_id, sync_status, name, description, is_active',
                    products: 'company_id, global_id, sync_status, name, code, cost_price, sell_price, stock_quantity, alert_threshold, image_url, category_id, vendor_id, brand_id, unit, weight, expiry_date, description, color, size, grade, condition, is_active, created_at, updated_at'
                };

                db.run(`INSERT INTO ${table}_new (${cols[table]}) SELECT ${cols[table]} FROM ${table} WHERE global_id IS NOT NULL GROUP BY global_id`, [], (err) => {
                    if (err) {
                        console.error(`Error copying data for ${table}:`, err.message);
                        db.run(`DROP TABLE IF EXISTS ${table}_new`, resolve);
                    } else {
                        db.run(`DROP TABLE IF EXISTS ${table}`);
                        db.run(`ALTER TABLE ${table}_new RENAME TO ${table}`, (err2) => {
                            if (err2) console.error(`Error renaming ${table}:`, err2.message);
                            else console.log(`✅ ${table} migrated successfully.`);
                            resolve();
                        });
                    }
                });
            });
        });
    }

    console.log("🏁 Migration finished.");
    db.close();
}

migrate();
function delay(ms) { return new Promise(res => setTimeout(res, ms)); }
