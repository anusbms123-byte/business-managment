const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { app } = require('electron') || {};

// Ensure database file is stored in user data directory for production persistence
// or in the project root for development
let dbPath;
try {
  dbPath = app && app.isPackaged
    ? path.join(app.getPath('userData'), 'business.db')
    : path.join(__dirname, 'business.db');
} catch (e) {
  // Fallback for standalone node scripts
  dbPath = path.join(__dirname, 'business.db');
}

console.log("Connecting to database at:", dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database opening error: ', err);
  } else {
    console.log('Database connected at:', dbPath);

    // Enable WAL mode for better concurrency (fixes SQLITE_BUSY errors)
    db.run("PRAGMA journal_mode = WAL", (err) => {
      if (err) console.error("WAL mode error:", err);
      else console.log("✓ Database WAL mode enabled");
    });

    // Set busy timeout to 5 seconds (wait instead of immediate error)
    db.run("PRAGMA busy_timeout = 5000", (err) => {
      if (err) console.error("Busy timeout error:", err);
      else console.log("✓ Database busy timeout set to 5s");
    });

    initSchema();
  }
});

function initSchema() {
  db.serialize(() => {
    // 0. Deletions Tracking (for offline-first sync)
    db.run(`CREATE TABLE IF NOT EXISTS pending_sync_deletions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT NOT NULL,
      global_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 1. Companies (Tenants)
    db.run(`CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      global_id TEXT UNIQUE, -- Cloud ID
      sync_status TEXT DEFAULT 'synced', -- pending, synced, failed
      name TEXT NOT NULL,
      address TEXT,
      phone TEXT,
      email TEXT,
      tax_no TEXT,
      currency_symbol TEXT DEFAULT 'PKR',
      logo_path TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 2. Users (Auth)
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER, 
      global_id TEXT UNIQUE, -- Cloud ID
      sync_status TEXT DEFAULT 'synced',
      username TEXT UNIQUE,
      password TEXT, 
      role TEXT DEFAULT 'admin',
      role_id TEXT,
      fullname TEXT,
      email TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(company_id) REFERENCES companies(id)
    )`);

    // 2.1 Roles & Permissions
    db.run(`CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id TEXT,
      global_id TEXT UNIQUE,
      sync_status TEXT DEFAULT 'synced',
      name TEXT NOT NULL,
      description TEXT,
      is_system INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role_id TEXT,
      global_id TEXT UNIQUE,
      sync_status TEXT DEFAULT 'synced',
      module TEXT NOT NULL,
      can_view INTEGER DEFAULT 0,
      can_create INTEGER DEFAULT 0,
      can_edit INTEGER DEFAULT 0,
      can_delete INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 3. Categories
    db.run(`CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id TEXT,
      global_id TEXT UNIQUE,
      sync_status TEXT DEFAULT 'synced',
      name TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 4. Brands
    db.run(`CREATE TABLE IF NOT EXISTS brands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id TEXT,
      global_id TEXT UNIQUE,
      sync_status TEXT DEFAULT 'synced',
      name TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 5. Vendors (Suppliers)
    db.run(`CREATE TABLE IF NOT EXISTS vendors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id TEXT,
      global_id TEXT UNIQUE,
      sync_status TEXT DEFAULT 'synced',
      name TEXT NOT NULL,
      company_name TEXT,
      contact_person TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      city TEXT,
      gst_no TEXT,
      opening_balance REAL DEFAULT 0,
      current_balance REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 5. Employees
    db.run(`CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      company_id TEXT,
      global_id TEXT UNIQUE,
      sync_status TEXT DEFAULT 'synced',
      first_name TEXT NOT NULL,
      last_name TEXT,
      phone TEXT,
      designation TEXT,
      salary REAL DEFAULT 0,
      hourly_rate REAL DEFAULT 0,
      joining_date DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 6. Products (Inventory)
    db.run(`CREATE TABLE IF NOT EXISTS products (
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
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(company_id) REFERENCES companies(id),
      FOREIGN KEY(category_id) REFERENCES categories(id),
      FOREIGN KEY(vendor_id) REFERENCES vendors(id)
    )`);

    // 7. Customers
    db.run(`CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id TEXT,
      global_id TEXT UNIQUE,
      sync_status TEXT DEFAULT 'synced',
      name TEXT NOT NULL,
      customer_type TEXT DEFAULT 'retail',
      phone TEXT,
      email TEXT,
      address TEXT,
      city TEXT,
      cnic TEXT,
      gst_no TEXT,
      credit_limit REAL DEFAULT 0,
      opening_balance REAL DEFAULT 0,
      current_balance REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(company_id) REFERENCES companies(id)
    )`);

    // 8. Sales (Head)
    db.run(`CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id TEXT,
      customer_id INTEGER,
      user_id INTEGER,
      global_id TEXT UNIQUE,
      sync_status TEXT DEFAULT 'synced',
      inv_number TEXT,
      total_amount REAL,
      discount REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      shipping_cost REAL DEFAULT 0,
      grand_total REAL,
      amount_paid REAL DEFAULT 0,
      payment_method TEXT DEFAULT 'cash',
      payment_status TEXT DEFAULT 'paid',
      sale_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(company_id) REFERENCES companies(id),
      FOREIGN KEY(customer_id) REFERENCES customers(id)
    )`);

    // 9. Sale Items (Detail)
    db.run(`CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id TEXT,
      product_id TEXT,
      global_id TEXT,
      quantity INTEGER,
      unit_price REAL,
      total_price REAL
    )`);

    // 10. Purchases (Head)
    db.run(`CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id TEXT,
      vendor_id TEXT,
      global_id TEXT UNIQUE,
      sync_status TEXT DEFAULT 'synced',
      ref_number TEXT,
      total_amount REAL,
      paid_amount REAL DEFAULT 0,
      shipping_cost REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      notes TEXT,
      payment_method TEXT DEFAULT 'CASH',
      payment_status TEXT DEFAULT 'RECEIVED',
      purchase_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      due_date DATE,
      status TEXT DEFAULT 'received',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 11. Purchase Items (Detail)
    db.run(`CREATE TABLE IF NOT EXISTS purchase_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_id TEXT,
      product_id TEXT,
      global_id TEXT UNIQUE,
      quantity INTEGER,
      unit_cost REAL,
      total_cost REAL
    )`);

    // 12. Expenses
    db.run(`CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id TEXT,
      global_id TEXT UNIQUE,
      sync_status TEXT DEFAULT 'synced',
      title TEXT,
      amount REAL,
      date DATETIME DEFAULT CURRENT_TIMESTAMP,
      description TEXT,
      category TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 13. Audit Logs
    db.run(`CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id TEXT,
      user_id TEXT,
      global_id TEXT UNIQUE,
      sync_status TEXT DEFAULT 'synced',
      action TEXT NOT NULL,
      module TEXT,
      details TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 14. Accounts (Accounting)
    db.run(`CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id TEXT,
      global_id TEXT UNIQUE,
      sync_status TEXT DEFAULT 'synced',
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      balance REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 15. Transactions (Accounting Detail)
    db.run(`CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id TEXT,
      global_id TEXT,
      date DATETIME DEFAULT CURRENT_TIMESTAMP,
      description TEXT,
      debit REAL DEFAULT 0,
      credit REAL DEFAULT 0
    )`);

    // 16. Sale Returns
    db.run(`CREATE TABLE IF NOT EXISTS sale_returns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id TEXT,
      customer_id TEXT,
      sale_id TEXT,
      global_id TEXT UNIQUE,
      sync_status TEXT DEFAULT 'synced',
      invoice_no TEXT,
      sub_total REAL,
      tax REAL DEFAULT 0,
      total_amount REAL,
      notes TEXT,
      date DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 17. Sale Return Items
    db.run(`CREATE TABLE IF NOT EXISTS sale_return_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      return_id TEXT,
      product_id TEXT,
      global_id TEXT,
      quantity INTEGER,
      price REAL,
      total REAL
    )`);

    // 18. Attendance (HRM)
    db.run(`CREATE TABLE IF NOT EXISTS attendances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id TEXT,
      employee_id TEXT,
      global_id TEXT UNIQUE,
      sync_status TEXT DEFAULT 'synced',
      date DATE,
      status TEXT,
      check_in DATETIME,
      check_out DATETIME
    )`);

    // 19. Salary Records (HRM)
    db.run(`CREATE TABLE IF NOT EXISTS salary_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id TEXT,
      employee_id TEXT,
      global_id TEXT UNIQUE,
      sync_status TEXT DEFAULT 'synced',
      month TEXT,
      base_salary REAL,
      bonus REAL DEFAULT 0,
      overtime_hours REAL DEFAULT 0,
      overtime_pay REAL DEFAULT 0,
      deductions REAL DEFAULT 0,
      net_salary REAL,
      payment_date DATETIME,
      status TEXT DEFAULT 'PAID'
    )`);

    // 20. Purchase Returns
    db.run(`CREATE TABLE IF NOT EXISTS purchase_returns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id TEXT,
      vendor_id TEXT,
      purchase_id TEXT,
      global_id TEXT UNIQUE,
      sync_status TEXT DEFAULT 'synced',
      invoice_no TEXT,
      sub_total REAL,
      tax REAL DEFAULT 0,
      total_amount REAL,
      notes TEXT,
      date DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 21. Purchase Return Items
    db.run(`CREATE TABLE IF NOT EXISTS purchase_return_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      return_id TEXT,
      product_id TEXT,
      global_id TEXT,
      quantity INTEGER,
      unit_cost REAL,
      total REAL
    )`);

    // Seed logic (kept basic for now)
  });
}

// Helper to add column if it doesn't exist (useful for migration)
function addColumnIfNotExists(table, column, type, defaultValue = null) {
  db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`, (err) => {
    if (err) {
      if (!err.message.includes('duplicate column name')) {
        console.error(`Migration Error (Adding ${column} to ${table}):`, err.message);
      }
    } else {
      console.log(`Migration Success: Added column ${column} to ${table}`);
      if (defaultValue !== null) {
        db.run(`UPDATE ${table} SET ${column} = ${defaultValue} WHERE ${column} IS NULL`);
      }
    }
  });
}

// Run migrations for existing databases
db.serialize(() => {
  console.log("Checking for database schema updates...");
  const tables = [
    'companies', 'users', 'categories', 'vendors', 'employees',
    'products', 'customers', 'sales', 'purchases', 'expenses',
    'audit_logs', 'brands', 'accounts', 'sale_returns',
    'purchase_returns', 'attendances', 'salary_records', 'roles', 'permissions'
  ];
  tables.forEach(table => {
    // SQLite ALTER TABLE ADD COLUMN does not support UNIQUE or PRIMARY KEY
    addColumnIfNotExists(table, 'global_id', 'TEXT');
    addColumnIfNotExists(table, 'sync_status', "TEXT", "'synced'");
    addColumnIfNotExists(table, 'company_id', "TEXT");
    addColumnIfNotExists(table, 'created_at', "DATETIME", "CURRENT_TIMESTAMP");
    addColumnIfNotExists(table, 'updated_at', "DATETIME", "CURRENT_TIMESTAMP");
  });

  // Inventory matching
  addColumnIfNotExists('products', 'unit', "TEXT", "'pcs'");
  addColumnIfNotExists('products', 'brand_id', "TEXT");
  addColumnIfNotExists('products', 'image_url', "TEXT");
  addColumnIfNotExists('products', 'alert_threshold', "INTEGER", "5");
  addColumnIfNotExists('products', 'weight', "REAL", "0");
  addColumnIfNotExists('products', 'color', "TEXT");
  addColumnIfNotExists('products', 'size', "TEXT");
  addColumnIfNotExists('products', 'grade', "TEXT");
  addColumnIfNotExists('products', 'condition', "TEXT");
  addColumnIfNotExists('products', 'expiry_date', "DATETIME");
  addColumnIfNotExists('products', 'description', "TEXT");
  addColumnIfNotExists('products', 'category_id', "TEXT");
  addColumnIfNotExists('products', 'vendor_id', "TEXT");
  addColumnIfNotExists('products', 'code', "TEXT");

  // CRM matching
  addColumnIfNotExists('customers', 'customer_type', "TEXT DEFAULT 'retail'");
  addColumnIfNotExists('customers', 'city', "TEXT");
  addColumnIfNotExists('customers', 'cnic', "TEXT");
  addColumnIfNotExists('customers', 'gst_no', "TEXT");
  addColumnIfNotExists('customers', 'credit_limit', "REAL DEFAULT 0");
  addColumnIfNotExists('customers', 'current_balance', "REAL DEFAULT 0");

  // HRM matching
  addColumnIfNotExists('employees', 'first_name', "TEXT");
  addColumnIfNotExists('employees', 'last_name', "TEXT");
  addColumnIfNotExists('employees', 'phone', "TEXT");
  addColumnIfNotExists('employees', 'designation', "TEXT");
  addColumnIfNotExists('employees', 'salary', "REAL", "0");
  addColumnIfNotExists('employees', 'hourly_rate', "REAL", "0");
  addColumnIfNotExists('employees', 'joining_date', "DATETIME");

  // Sales matching
  addColumnIfNotExists('sales', 'inv_number', "TEXT");
  addColumnIfNotExists('sales', 'amount_paid', "REAL DEFAULT 0");
  addColumnIfNotExists('sales', 'payment_status', "TEXT DEFAULT 'paid'");
  addColumnIfNotExists('sales', 'payment_method', "TEXT DEFAULT 'cash'");
  addColumnIfNotExists('sales', 'grand_total', "REAL DEFAULT 0");
  addColumnIfNotExists('sales', 'total_amount', "REAL DEFAULT 0");
  addColumnIfNotExists('sales', 'discount', "REAL DEFAULT 0");
  addColumnIfNotExists('sales', 'shipping_cost', "REAL DEFAULT 0");
  addColumnIfNotExists('sales', 'customer_id', "TEXT");
  addColumnIfNotExists('sales', 'user_id', "TEXT");
  addColumnIfNotExists('users', 'role_id', "TEXT");

  // Purchases matching
  addColumnIfNotExists('purchases', 'ref_number', "TEXT");
  addColumnIfNotExists('purchases', 'total_amount', "REAL DEFAULT 0");
  addColumnIfNotExists('purchases', 'paid_amount', "REAL DEFAULT 0");
  addColumnIfNotExists('purchases', 'shipping_cost', "REAL DEFAULT 0");
  addColumnIfNotExists('purchases', 'discount', "REAL DEFAULT 0");
  addColumnIfNotExists('purchases', 'tax_amount', "REAL DEFAULT 0");
  addColumnIfNotExists('purchases', 'notes', "TEXT");
  addColumnIfNotExists('purchases', 'payment_method', "TEXT DEFAULT 'CASH'");
  addColumnIfNotExists('purchases', 'payment_status', "TEXT DEFAULT 'RECEIVED'");
  addColumnIfNotExists('purchases', 'due_date', "DATE");
  addColumnIfNotExists('purchases', 'vendor_id', "TEXT");

  // Vendors matching
  addColumnIfNotExists('vendors', 'company_name', "TEXT");
  addColumnIfNotExists('vendors', 'contact_person', "TEXT");
  addColumnIfNotExists('vendors', 'opening_balance', "REAL DEFAULT 0");
  addColumnIfNotExists('vendors', 'current_balance', "REAL DEFAULT 0");
  addColumnIfNotExists('vendors', 'gst_no', "TEXT");

  // Detail items
  addColumnIfNotExists('sale_items', 'global_id', 'TEXT');
  addColumnIfNotExists('sale_items', 'sale_id', 'TEXT');
  addColumnIfNotExists('sale_items', 'product_id', 'TEXT');
  addColumnIfNotExists('purchase_items', 'global_id', 'TEXT');
  addColumnIfNotExists('purchase_items', 'purchase_id', 'TEXT');
  addColumnIfNotExists('purchase_items', 'product_id', 'TEXT');

  // Status columns for all major tables
  const statusTables = ['customers', 'vendors', 'categories', 'brands', 'expenses', 'accounts', 'employees', 'purchases', 'sales', 'roles', 'products', 'users', 'companies'];
  statusTables.forEach(t => addColumnIfNotExists(t, 'is_active', "INTEGER DEFAULT 1"));

  // ===== PERFORMANCE INDICES =====
  // These indices dramatically improve query performance for company filtering and global_id lookups
  console.log("Creating performance indices...");

  db.run("CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id)");
  db.run("CREATE INDEX IF NOT EXISTS idx_users_global ON users(global_id)");
  db.run("CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id)");

  db.run("CREATE INDEX IF NOT EXISTS idx_roles_company ON roles(company_id)");
  db.run("CREATE INDEX IF NOT EXISTS idx_roles_global ON roles(global_id)");

  db.run("CREATE INDEX IF NOT EXISTS idx_permissions_role ON permissions(role_id)");
  db.run("CREATE INDEX IF NOT EXISTS idx_permissions_global ON permissions(global_id)");

  db.run("CREATE INDEX IF NOT EXISTS idx_products_company ON products(company_id)");
  db.run("CREATE INDEX IF NOT EXISTS idx_products_global ON products(global_id)");

  db.run("CREATE INDEX IF NOT EXISTS idx_sales_company ON sales(company_id)");
  db.run("CREATE INDEX IF NOT EXISTS idx_sales_global ON sales(global_id)");

  db.run("CREATE INDEX IF NOT EXISTS idx_customers_company ON customers(company_id)");
  db.run("CREATE INDEX IF NOT EXISTS idx_vendors_company ON vendors(company_id)");
  db.run("CREATE INDEX IF NOT EXISTS idx_categories_company ON categories(company_id)");
  db.run("CREATE INDEX IF NOT EXISTS idx_brands_company ON brands(company_id)");

  db.run("CREATE INDEX IF NOT EXISTS idx_purchases_company ON purchases(company_id)");
  db.run("CREATE INDEX IF NOT EXISTS idx_expenses_company ON expenses(company_id)");
});

module.exports = db;
