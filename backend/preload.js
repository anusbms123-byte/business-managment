console.log('Preload script starting...');
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Auth
    loginUser: (credentials) => ipcRenderer.invoke('login', credentials),

    // Company APIs
    getCompanies: () => ipcRenderer.invoke('get-companies'),
    getCompany: (companyId) => ipcRenderer.invoke('get-company', companyId),
    createCompany: (data) => ipcRenderer.invoke('create-company', data),
    updateCompany: (data) => ipcRenderer.invoke('update-company', data),
    deleteCompany: (id) => ipcRenderer.invoke('delete-company', id),

    // User APIs
    getUsers: (companyId) => ipcRenderer.invoke('get-users', companyId),
    createUser: (data) => ipcRenderer.invoke('create-user', data),
    updateUser: (data) => ipcRenderer.invoke('update-user', data),
    deleteUser: (id) => ipcRenderer.invoke('delete-user', id),

    // Customer APIs
    getCustomers: (companyId) => ipcRenderer.invoke('get-customers', companyId),
    createCustomer: (data) => ipcRenderer.invoke('create-customer', data),
    updateCustomer: (data) => ipcRenderer.invoke('update-customer', data),
    deleteCustomer: (id) => ipcRenderer.invoke("delete-customer", id),
    deleteSale: (id) => ipcRenderer.invoke("delete-sale", id),

    // Vendor (Supplier) APIs
    getVendors: (companyId) => ipcRenderer.invoke('get-vendors', companyId),
    createVendor: (data) => ipcRenderer.invoke('create-vendor', data),
    updateVendor: (data) => ipcRenderer.invoke('update-vendor', data),
    deleteVendor: (id) => ipcRenderer.invoke('delete-vendor', id),

    // Role & Permission APIs
    getRoles: (companyId) => ipcRenderer.invoke('get-roles', companyId),
    createRole: (data) => ipcRenderer.invoke('create-role', data),
    updateRole: (data) => ipcRenderer.invoke('update-role', data),
    deleteRole: (id) => ipcRenderer.invoke('delete-role', id),
    getPermissions: (roleId) => ipcRenderer.invoke('get-permissions', roleId),

    // Inventory APIs
    getBrands: (companyId) => ipcRenderer.invoke('get-brands', companyId),
    createBrand: (data) => ipcRenderer.invoke('create-brand', data),
    updateBrand: (data) => ipcRenderer.invoke('update-brand', data),
    deleteBrand: (id) => ipcRenderer.invoke('delete-brand', id),

    getCategories: (companyId) => ipcRenderer.invoke('get-categories', companyId),
    createCategory: (data) => ipcRenderer.invoke('create-category', data),
    updateCategory: (data) => ipcRenderer.invoke('update-category', data),
    deleteCategory: (id) => ipcRenderer.invoke('delete-category', id),

    getProducts: (companyId) => ipcRenderer.invoke('get-products', companyId),
    createProduct: (data) => ipcRenderer.invoke('create-product', data),
    updateProduct: (data) => ipcRenderer.invoke('update-product', data),
    deleteProduct: (id) => ipcRenderer.invoke('delete-product', id),

    // Audit Log APIs
    getAuditLogs: (params) => ipcRenderer.invoke('get-audit-logs', params),
    createAuditLog: (data) => ipcRenderer.invoke('create-audit-log', data),

    // Legacy APIs (for existing components)
    getSales: (companyId) => ipcRenderer.invoke('get-sales', companyId),
    addSale: (data) => ipcRenderer.invoke('add-sale', data),
    updateSale: (data) => ipcRenderer.invoke('update-sale', data),

    // Purchase APIs
    getPurchases: (companyId) => ipcRenderer.invoke('get-purchases', companyId),
    addPurchase: (data) => ipcRenderer.invoke('add-purchase', data),
    updatePurchase: (data) => ipcRenderer.invoke('update-purchase', data),
    deletePurchase: (id) => ipcRenderer.invoke("delete-purchase", id),

    // Returns APIs
    getSaleReturns: (companyId) => ipcRenderer.invoke('get-sale-returns', companyId),
    handleSaleReturn: (data) => ipcRenderer.invoke('add-sale-return', data),
    deleteSaleReturn: (id) => ipcRenderer.invoke('delete-sale-return', id),

    getPurchaseReturns: (companyId) => ipcRenderer.invoke('get-purchase-returns', companyId),
    handlePurchaseReturn: (data) => ipcRenderer.invoke('add-purchase-return', data),
    deletePurchaseReturn: (id) => ipcRenderer.invoke('delete-purchase-return', id),
    // Expenses
    getExpenses: (companyId) => ipcRenderer.invoke('get-expenses', companyId),
    createExpense: (data) => ipcRenderer.invoke('create-expense', data),
    updateExpense: (data) => ipcRenderer.invoke('update-expense', data),
    deleteExpense: (id) => ipcRenderer.invoke('delete-expense', id),

    // HRM
    getEmployees: (companyId) => ipcRenderer.invoke('get-employees', companyId),
    createEmployee: (data) => ipcRenderer.invoke('create-employee', data),
    updateEmployee: (data) => ipcRenderer.invoke('update-employee', data),
    deleteEmployee: (id) => ipcRenderer.invoke('delete-employee', id),
    getAttendance: (params) => ipcRenderer.invoke('get-attendance', params),
    saveAttendance: (data) => ipcRenderer.invoke('save-attendance', data),
    getSalaries: (params) => ipcRenderer.invoke('get-salaries', params),
    createSalary: (data) => ipcRenderer.invoke('create-salary', data),

    // Reports
    getReportSummary: (params) => ipcRenderer.invoke('get-report-summary', params),

    // Backup & Restore
    createBackup: (companyId) => ipcRenderer.invoke('create-backup', companyId),
    restoreBackup: (companyId) => ipcRenderer.invoke('restore-backup', companyId),
});
