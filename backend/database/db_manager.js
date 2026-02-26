const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { app } = require('electron') || {};

// Ensure database file location
let dbPath;
try {
  dbPath = app && app.isPackaged
    ? path.join(app.getPath('userData'), 'business.db')
    : path.join(__dirname, 'business.db');
} catch (e) {
  dbPath = path.join(__dirname, 'business.db');
}

console.log("[DB] Connecting to database at:", dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('[DB] Connection error: ', err);
  } else {
    console.log('[DB] Connected.');
    db.run("PRAGMA journal_mode = WAL");
    db.run("PRAGMA busy_timeout = 5000");
    db.run("PRAGMA synchronous = NORMAL");
  }
});

// Promise wrappers
db.asyncRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

db.asyncGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

db.asyncAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Helper for migrations
async function ensureColumn(table, column, type, defaultValue = null) {
  try {
    // Check if column exists first to avoid unnecessary error logs
    const info = await db.asyncAll(`PRAGMA table_info(${table})`);
    const exists = info.some(c => c.name === column);
    if (!exists) {
      await db.asyncRun(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
      console.log(`[DB] Added column ${column} to ${table}`);
      if (defaultValue !== null) {
        await db.asyncRun(`UPDATE ${table} SET ${column} = ${defaultValue} WHERE ${column} IS NULL`);
      }
    }
  } catch (err) {
    if (!err.message.includes('duplicate column name')) {
      console.warn(`[DB] Column update skipped for ${table}.${column}:`, err.message);
    }
  }
}

/**
 * INITIALIZATION SEQUENCE
 * Ensures all columns (company_id, sync_status, etc) exist before app starts.
 */
db.initPromise = (async () => {
  console.log("[DB] Initializing strictly...");

  try {
    // 1. CREATE CORE TABLES (IF NOT EXIST)
    const tables = [
      'pending_sync_deletions (id INTEGER PRIMARY KEY AUTOINCREMENT, table_name TEXT, global_id TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)',
      'companies (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, address TEXT, phone TEXT, email TEXT, tax_no TEXT, referral_code TEXT, is_active INTEGER DEFAULT 1, sync_status TEXT DEFAULT \'synced\', global_id TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)',
      'users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT, role TEXT, role_id TEXT, fullname TEXT, company_id TEXT, is_active INTEGER DEFAULT 1, sync_status TEXT DEFAULT \'synced\', global_id TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)',
      'roles (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, description TEXT, is_system INTEGER DEFAULT 0, company_id TEXT, global_id TEXT, sync_status TEXT DEFAULT \'synced\', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)',
      'permissions (id INTEGER PRIMARY KEY AUTOINCREMENT, role_id TEXT, module TEXT NOT NULL, can_view INTEGER DEFAULT 0, can_create INTEGER DEFAULT 0, can_edit INTEGER DEFAULT 0, can_delete INTEGER DEFAULT 0, global_id TEXT, sync_status TEXT DEFAULT \'synced\', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(role_id, module))',
      'categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL)',
      'brands (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL)',
      'vendors (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL)',
      'employees (id INTEGER PRIMARY KEY AUTOINCREMENT, first_name TEXT NOT NULL)',
      'products (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL)',
      'customers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL)',
      'sales (id INTEGER PRIMARY KEY AUTOINCREMENT, inv_number TEXT)',
      'sale_items (id INTEGER PRIMARY KEY AUTOINCREMENT)',
      'purchases (id INTEGER PRIMARY KEY AUTOINCREMENT, ref_number TEXT)',
      'purchase_items (id INTEGER PRIMARY KEY AUTOINCREMENT)',
      'expenses (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT)',
      'audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, action TEXT NOT NULL)',
      'accounts (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL)',
      'transactions (id INTEGER PRIMARY KEY AUTOINCREMENT)',
      'sale_returns (id INTEGER PRIMARY KEY AUTOINCREMENT)',
      'sale_return_items (id INTEGER PRIMARY KEY AUTOINCREMENT)',
      'attendances (id INTEGER PRIMARY KEY AUTOINCREMENT)',
      'salary_records (id INTEGER PRIMARY KEY AUTOINCREMENT)',
      'purchase_returns (id INTEGER PRIMARY KEY AUTOINCREMENT)',
      'purchase_return_items (id INTEGER PRIMARY KEY AUTOINCREMENT)'
    ];

    for (const t of tables) {
      await db.asyncRun(`CREATE TABLE IF NOT EXISTS ${t}`);
    }

    // 2. MIGRATIONS
    // Employees Table Fixed Type Change
    const empSchema = await db.asyncGet("SELECT sql FROM sqlite_master WHERE type='table' AND name='employees'");
    if (empSchema && empSchema.sql && empSchema.sql.includes('id TEXT PRIMARY KEY')) {
      console.log("[DB] MIGRATION: Fixing employees table id type...");
      await db.asyncRun("ALTER TABLE employees RENAME TO employees_old");
      await db.asyncRun(`CREATE TABLE employees (id INTEGER PRIMARY KEY AUTOINCREMENT, first_name TEXT NOT NULL)`);
      await db.asyncRun(`INSERT INTO employees (id, first_name) SELECT CAST(id AS INTEGER), first_name FROM employees_old`);
      await db.asyncRun("DROP TABLE employees_old");
    }

    // Permissions Unique Constraint
    const permSchema = await db.asyncGet("SELECT sql FROM sqlite_master WHERE type='table' AND name='permissions'");
    if (permSchema && permSchema.sql && !permSchema.sql.toLowerCase().includes('unique(role_id, module)')) {
      console.log("[DB] MIGRATION: Adding unique constraint to permissions...");
      await db.asyncRun("CREATE TABLE permissions_new (id INTEGER PRIMARY KEY AUTOINCREMENT, role_id TEXT, module TEXT NOT NULL, UNIQUE(role_id, module))");
      await db.asyncRun("INSERT OR IGNORE INTO permissions_new (role_id, module) SELECT role_id, module FROM permissions");
      await db.asyncRun("DROP TABLE permissions");
      await db.asyncRun("ALTER TABLE permissions_new RENAME TO permissions");
    }

    // 3. BATCH COLUMN UPDATES
    const columnTargets = [
      'companies', 'users', 'categories', 'vendors', 'employees',
      'products', 'customers', 'sales', 'purchases', 'expenses',
      'audit_logs', 'brands', 'accounts', 'sale_returns',
      'purchase_returns', 'attendances', 'salary_records', 'roles', 'permissions'
    ];

    for (const t of columnTargets) {
      await ensureColumn(t, 'global_id', 'TEXT');
      await ensureColumn(t, 'company_id', 'TEXT');
      await ensureColumn(t, 'sync_status', 'TEXT', "'synced'");
      await ensureColumn(t, 'is_active', 'INTEGER', '1');
      await ensureColumn(t, 'created_at', 'DATETIME', 'CURRENT_TIMESTAMP');
      await ensureColumn(t, 'updated_at', 'DATETIME', 'CURRENT_TIMESTAMP');
    }

    // 4. MODULE SPECIFIC COLUMNS
    // Products
    await ensureColumn('products', 'code', 'TEXT');
    await ensureColumn('products', 'cost_price', 'REAL', '0');
    await ensureColumn('products', 'sell_price', 'REAL', '0');
    await ensureColumn('products', 'stock_quantity', 'INTEGER', '0');
    await ensureColumn('products', 'alert_threshold', 'INTEGER', '5');
    await ensureColumn('products', 'image_url', 'TEXT');
    await ensureColumn('products', 'category_id', 'TEXT');
    await ensureColumn('products', 'vendor_id', 'TEXT');
    await ensureColumn('products', 'brand_id', 'TEXT');
    await ensureColumn('products', 'unit', 'TEXT', "'pcs'");
    await ensureColumn('products', 'weight', 'REAL', '0');
    await ensureColumn('products', 'expiry_date', 'DATETIME');
    await ensureColumn('products', 'description', 'TEXT');
    await ensureColumn('products', 'color', 'TEXT');
    await ensureColumn('products', 'size', 'TEXT');
    await ensureColumn('products', 'grade', 'TEXT');
    await ensureColumn('products', 'condition', 'TEXT');

    // Users
    await ensureColumn('users', 'password', 'TEXT');
    await ensureColumn('users', 'role', 'TEXT', "'admin'");
    await ensureColumn('users', 'role_id', 'TEXT');
    await ensureColumn('users', 'fullname', 'TEXT');
    await ensureColumn('users', 'email', 'TEXT');

    // Companies
    await ensureColumn('companies', 'address', 'TEXT');
    await ensureColumn('companies', 'phone', 'TEXT');
    await ensureColumn('companies', 'email', 'TEXT');
    await ensureColumn('companies', 'tax_no', 'TEXT');
    await ensureColumn('companies', 'currency_symbol', 'TEXT', "'PKR'");
    await ensureColumn('companies', 'logo_path', 'TEXT');
    await ensureColumn('companies', 'referral_code', 'TEXT');

    // Customers
    await ensureColumn('customers', 'customer_type', 'TEXT', "'retail'");
    await ensureColumn('customers', 'phone', 'TEXT');
    await ensureColumn('customers', 'email', 'TEXT');
    await ensureColumn('customers', 'address', 'TEXT');
    await ensureColumn('customers', 'city', 'TEXT');
    await ensureColumn('customers', 'cnic', 'TEXT');
    await ensureColumn('customers', 'gst_no', 'TEXT');
    await ensureColumn('customers', 'credit_limit', 'REAL', '0');
    await ensureColumn('customers', 'opening_balance', 'REAL', '0');
    await ensureColumn('customers', 'current_balance', 'REAL', '0');

    // Sales & Items
    await ensureColumn('sales', 'customer_id', 'TEXT');
    await ensureColumn('sales', 'user_id', 'TEXT');
    await ensureColumn('sales', 'total_amount', 'REAL', '0');
    await ensureColumn('sales', 'discount', 'REAL', '0');
    await ensureColumn('sales', 'tax_amount', 'REAL', '0');
    await ensureColumn('sales', 'shipping_cost', 'REAL', '0');
    await ensureColumn('sales', 'grand_total', 'REAL', '0');
    await ensureColumn('sales', 'amount_paid', 'REAL', '0');
    await ensureColumn('sales', 'payment_method', 'TEXT', "'cash'");
    await ensureColumn('sales', 'payment_status', 'TEXT', "'paid'");
    await ensureColumn('sales', 'sale_date', 'DATETIME', 'CURRENT_TIMESTAMP');
    await ensureColumn('sales', 'notes', 'TEXT');

    await ensureColumn('sale_items', 'sale_id', 'TEXT');
    await ensureColumn('sale_items', 'product_id', 'TEXT');
    await ensureColumn('sale_items', 'global_id', 'TEXT');
    await ensureColumn('sale_items', 'quantity', 'INTEGER', '1');
    await ensureColumn('sale_items', 'unit_price', 'REAL', '0');
    await ensureColumn('sale_items', 'total_price', 'REAL', '0');

    // Purchases & Items
    await ensureColumn('purchases', 'vendor_id', 'TEXT');
    await ensureColumn('purchases', 'total_amount', 'REAL', '0');
    await ensureColumn('purchases', 'paid_amount', 'REAL', '0');
    await ensureColumn('purchases', 'shipping_cost', 'REAL', '0');
    await ensureColumn('purchases', 'discount', 'REAL', '0');
    await ensureColumn('purchases', 'tax_amount', 'REAL', '0');
    await ensureColumn('purchases', 'payment_method', 'TEXT', "'CASH'");
    await ensureColumn('purchases', 'payment_status', 'TEXT', "'RECEIVED'");
    await ensureColumn('purchases', 'purchase_date', 'DATETIME', 'CURRENT_TIMESTAMP');
    await ensureColumn('purchases', 'due_date', 'DATE');
    await ensureColumn('purchases', 'notes', 'TEXT');

    await ensureColumn('purchase_items', 'purchase_id', 'TEXT');
    await ensureColumn('purchase_items', 'product_id', 'TEXT');
    await ensureColumn('purchase_items', 'global_id', 'TEXT');
    await ensureColumn('purchase_items', 'quantity', 'INTEGER', '1');
    await ensureColumn('purchase_items', 'unit_cost', 'REAL', '0');
    await ensureColumn('purchase_items', 'total_cost', 'REAL', '0');

    // HRM & Others
    await ensureColumn('employees', 'last_name', 'TEXT');
    await ensureColumn('employees', 'phone', 'TEXT');
    await ensureColumn('employees', 'designation', 'TEXT');
    await ensureColumn('employees', 'salary', 'REAL', '0');
    await ensureColumn('employees', 'hourly_rate', 'REAL', '0');
    await ensureColumn('employees', 'joining_date', 'DATETIME');

    await ensureColumn('salary_records', 'employee_id', 'TEXT');
    await ensureColumn('salary_records', 'month', 'TEXT');
    await ensureColumn('salary_records', 'base_salary', 'REAL', '0');
    await ensureColumn('salary_records', 'bonus', 'REAL', '0');
    await ensureColumn('salary_records', 'overtime_hours', 'REAL', '0');
    await ensureColumn('salary_records', 'overtime_pay', 'REAL', '0');
    await ensureColumn('salary_records', 'deductions', 'REAL', '0');
    await ensureColumn('salary_records', 'net_salary', 'REAL', '0');
    await ensureColumn('salary_records', 'notes', 'TEXT');
    await ensureColumn('salary_records', 'payment_date', 'DATETIME');
    await ensureColumn('salary_records', 'status', 'TEXT', "'PAID'");

    await ensureColumn('permissions', 'can_view', 'INTEGER', '0');
    await ensureColumn('permissions', 'can_create', 'INTEGER', '0');
    await ensureColumn('permissions', 'can_edit', 'INTEGER', '0');
    await ensureColumn('permissions', 'can_delete', 'INTEGER', '0');
    await ensureColumn('roles', 'description', 'TEXT');
    await ensureColumn('roles', 'is_system', 'INTEGER', '0');

    // 5. INDICES
    const indexTables = ['users', 'roles', 'permissions', 'products', 'sales', 'customers', 'vendors', 'categories', 'brands', 'purchases', 'expenses'];
    for (const t of indexTables) {
      await db.asyncRun(`CREATE INDEX IF NOT EXISTS idx_${t}_comp ON ${t}(company_id)`);
      await db.asyncRun(`CREATE INDEX IF NOT EXISTS idx_${t}_glob ON ${t}(global_id)`);
    }

    // 6. SEEDS
    const systemRoles = [
      { gid: 'system-super-admin', name: 'Super Admin', desc: 'System-wide administrative access', modules: ['users', 'roles', 'settings', 'backup'], type: 'full' },
      { gid: 'system-admin-template', name: 'Admin', desc: 'Full company access (Template)', modules: 'all', type: 'full' },
      { gid: 'system-manager-template', name: 'Manager', desc: 'Management level access (Template)', modules: 'all', type: 'mid' }
    ];

    const allModules = ['dashboard', 'sales', 'purchase', 'returns', 'products', 'inventory', 'customers', 'suppliers', 'expenses', 'reports', 'hrm', 'accounting', 'users', 'roles', 'settings', 'backup'];

    for (const role of systemRoles) {
      const existing = await db.asyncGet("SELECT id FROM roles WHERE global_id = ? OR name = ?", [role.gid, role.name]);
      if (!existing) {
        console.log(`[SEED] Creating Role: ${role.name}`);
        await db.asyncRun("INSERT INTO roles (global_id, name, description, company_id, sync_status, is_system) VALUES (?, ?, ?, NULL, 'synced', 1)", [role.gid, role.name, role.desc]);

        const targetModules = role.modules === 'all' ? allModules : role.modules;
        for (const mod of targetModules) {
          let v = 1, c = 0, e = 0, d = 0;
          if (role.type === 'full') { c = 1; e = 1; d = 1; }
          else if (role.type === 'mid' && ['sales', 'customers', 'products', 'expenses'].includes(mod)) { c = 1; e = 1; }

          await db.asyncRun("INSERT OR IGNORE INTO permissions (global_id, role_id, module, can_view, can_create, can_edit, can_delete, sync_status) VALUES (?, ?, ?, ?, ?, ?, ?, 'synced')",
            [`perm-${role.gid}-${mod}`, role.gid, mod, v, c, e, d]);
        }
      }
    }

    console.log("[DB] Initialization completed successfully.");
  } catch (err) {
    console.error("[DB] Initialization FAILED:", err);
    throw err;
  }
})();

module.exports = db;
