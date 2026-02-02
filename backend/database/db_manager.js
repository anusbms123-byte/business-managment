const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { app } = require('electron');

// Ensure database file is stored in user data directory for production persistence
// or in the project root for development
const dbPath = app.isPackaged
  ? path.join(app.getPath('userData'), 'business.db')
  : path.join(__dirname, 'business.db');

console.log("Connecting to database at:", dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database opening error: ', err);
  } else {
    console.log('Database connected at:', dbPath);
    initSchema();
  }
});

function initSchema() {
  db.serialize(() => {
    // 1. Companies (Tenants)
    db.run(`CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      global_id TEXT, -- Cloud ID
      sync_status TEXT DEFAULT 'pending', -- pending, synced, failed
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

    // 2. Users (Auth) - Now linked to a Company
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER, -- Null for Super Admin
      global_id TEXT, -- Cloud ID
      sync_status TEXT DEFAULT 'pending', -- pending, synced, failed
      username TEXT UNIQUE,
      password TEXT, 
      role TEXT DEFAULT 'admin', -- super_admin, admin, manager, cashier
      fullname TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(company_id) REFERENCES companies(id)
    )`);

    // 3. Categories
    db.run(`CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER,
      name TEXT,
      description TEXT,
      FOREIGN KEY(company_id) REFERENCES companies(id)
    )`);

    // 4. Vendors (Suppliers)
    db.run(`CREATE TABLE IF NOT EXISTS vendors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER,
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
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(company_id) REFERENCES companies(id)
    )`);

    // 5. Employees
    db.run(`CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      company_id TEXT,
      first_name TEXT NOT NULL,
      last_name TEXT,
      phone TEXT,
      designation TEXT,
      salary REAL DEFAULT 0,
      hourly_rate REAL DEFAULT 0,
      joining_date DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(company_id) REFERENCES companies(id)
    )`);

    // 5. Products (Inventory)
    db.run(`CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER,
      code TEXT, -- Barcode/SKU
      name TEXT NOT NULL,
      description TEXT,
      unit TEXT DEFAULT 'pcs', -- pcs, kg, m, etc.
      category_id INTEGER,
      vendor_id INTEGER,
      cost_price REAL DEFAULT 0,
      sell_price REAL DEFAULT 0,
      stock_quantity INTEGER DEFAULT 0,
      alert_threshold INTEGER DEFAULT 5,
      weight REAL,
      expiry_date DATE,
      image_path TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(company_id) REFERENCES companies(id),
      FOREIGN KEY(category_id) REFERENCES categories(id),
      FOREIGN KEY(vendor_id) REFERENCES vendors(id)
    )`);

    // 6. Customers
    db.run(`CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER,
      name TEXT NOT NULL,
      customer_type TEXT DEFAULT 'retail', -- retail, wholesale
      cnic TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      city TEXT,
      gst_no TEXT,
      credit_limit REAL DEFAULT 0,
      opening_balance REAL DEFAULT 0,
      current_balance REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(company_id) REFERENCES companies(id)
    )`);

    // 7. Sales (Head)
    db.run(`CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER,
      customer_id INTEGER,
      user_id INTEGER,
      inv_number TEXT,
      total_amount REAL,
      discount REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      shipping_cost REAL DEFAULT 0,
      grand_total REAL,
      amount_paid REAL DEFAULT 0,
      payment_method TEXT DEFAULT 'cash', -- cash, bank, card, credit
      payment_status TEXT DEFAULT 'paid', -- paid, partial, due
      sale_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(company_id) REFERENCES companies(id),
      FOREIGN KEY(customer_id) REFERENCES customers(id)
    )`);

    // 8. Sale Items (Detail)
    db.run(`CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER,
      product_id INTEGER,
      quantity INTEGER,
      unit_price REAL,
      total_price REAL,
      FOREIGN KEY(sale_id) REFERENCES sales(id),
      FOREIGN KEY(product_id) REFERENCES products(id)
    )`);

    // 9. Purchases (Head)
    db.run(`CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER,
      vendor_id INTEGER,
      ref_number TEXT,
      total_amount REAL,
      paid_amount REAL DEFAULT 0,
      shipping_cost REAL DEFAULT 0,
      purchase_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      due_date DATE,
      payment_status TEXT DEFAULT 'received', -- ordered, received, partial
      status TEXT DEFAULT 'received',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(company_id) REFERENCES companies(id),
      FOREIGN KEY(vendor_id) REFERENCES vendors(id)
    )`);

    // 10. Purchase Items (Detail)
    db.run(`CREATE TABLE IF NOT EXISTS purchase_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_id INTEGER,
      product_id INTEGER,
      quantity INTEGER,
      unit_cost REAL,
      total_cost REAL,
      FOREIGN KEY(purchase_id) REFERENCES purchases(id),
      FOREIGN KEY(product_id) REFERENCES products(id)
    )`);

    // 11. Roles (Custom roles per company)
    db.run(`CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER,
      name TEXT NOT NULL,
      description TEXT,
      is_system INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(company_id) REFERENCES companies(id)
    )`);

    // 12. Permissions (Granular module access per role)
    db.run(`CREATE TABLE IF NOT EXISTS permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role_id INTEGER NOT NULL,
      module TEXT NOT NULL,
      can_view INTEGER DEFAULT 0,
      can_create INTEGER DEFAULT 0,
      can_edit INTEGER DEFAULT 0,
      can_delete INTEGER DEFAULT 0,
      FOREIGN KEY(role_id) REFERENCES roles(id) ON DELETE CASCADE
    )`);

    // 13. Audit Logs (Track user actions)
    db.run(`CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER,
      user_id INTEGER,
      action TEXT NOT NULL,
      module TEXT,
      details TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(company_id) REFERENCES companies(id),
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    // Seed default system roles if not exists
    db.get("SELECT count(*) as count FROM roles WHERE is_system = 1", (err, row) => {
      if (row && row.count === 0) {
        // Create system roles (null company_id means system-wide)
        const systemRoles = [
          { name: 'Super Admin', description: 'Full system access', isSystem: 1 },
          { name: 'Admin', description: 'Full company access', isSystem: 1 },
          { name: 'Manager', description: 'Management level access', isSystem: 1 },
          { name: 'Cashier', description: 'Basic sales access', isSystem: 1 },
        ];

        const modules = ['dashboard', 'sales', 'purchase', 'products', 'inventory',
          'customers', 'suppliers', 'expenses', 'reports', 'users', 'settings'];

        systemRoles.forEach((role, idx) => {
          db.run(`INSERT INTO roles (company_id, name, description, is_system) VALUES (?, ?, ?, ?)`,
            [null, role.name, role.description, role.isSystem], function (err) {
              if (!err && this.lastID) {
                const roleId = this.lastID;
                // Create permissions for each module based on role
                modules.forEach(module => {
                  let perms = { view: 1, create: 0, edit: 0, delete: 0 };

                  if (role.name === 'Super Admin' || role.name === 'Admin') {
                    perms = { view: 1, create: 1, edit: 1, delete: 1 };
                  } else if (role.name === 'Manager') {
                    perms = { view: 1, create: 1, edit: 1, delete: 0 };
                    if (module === 'users' || module === 'settings') {
                      perms = { view: 1, create: 0, edit: 0, delete: 0 };
                    }
                  } else if (role.name === 'Cashier') {
                    perms = { view: 1, create: 0, edit: 0, delete: 0 };
                    if (module === 'sales') {
                      perms = { view: 1, create: 1, edit: 0, delete: 0 };
                    }
                    if (module === 'users' || module === 'settings') {
                      perms = { view: 0, create: 0, edit: 0, delete: 0 };
                    }
                  }

                  db.run(`INSERT INTO permissions (role_id, module, can_view, can_create, can_edit, can_delete) 
                          VALUES (?, ?, ?, ?, ?, ?)`,
                    [roleId, module, perms.view, perms.create, perms.edit, perms.delete]);
                });
              }
            });
        });
        console.log("System roles and permissions created.");
      }
    });

    // Seed Super Admin if not exists
    db.get("SELECT count(*) as count FROM users WHERE role='super_admin'", (err, row) => {
      if (row && row.count === 0) {
        // Create Super Admin
        db.run(`INSERT INTO users (username, password, role, fullname) VALUES (?, ?, ?, ?)`,
          ['superadmin', 'admin123', 'super_admin', 'System Owner']);
        console.log("Super Admin created.");

        // Create Default Company (For demo/first use)
        db.run(`INSERT INTO companies (name) VALUES (?)`, ['Default Company'], function (err) {
          if (!err && this.lastID) {
            const companyId = this.lastID;
            // Create Admin for this company
            db.run(`INSERT INTO users (company_id, username, password, role, fullname) VALUES (?, ?, ?, ?, ?)`,
              [companyId, 'admin', 'admin123', 'admin', 'Business Owner']);
            console.log("Default Company and Admin created.");
          }
        });
      }
    });

  });
}

module.exports = db;
