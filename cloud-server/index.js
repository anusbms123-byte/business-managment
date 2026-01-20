const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const { withAccelerate } = require('@prisma/extension-accelerate');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const prisma = new PrismaClient().$extends(withAccelerate());
const PORT = process.env.PORT || 2000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // TODO: Move to .env

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Helper: Error Handler
const handleError = (res, e, msg = "Server Error") => {
    console.error(msg, e);
    res.status(500).json({ success: false, message: e.message });
};

// ==========================================
// AUTHENTICATION
// ==========================================
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await prisma.user.findUnique({
            where: { username },
            include: {
                company: true,
                role: {
                    include: { permissions: true }
                }
            }
        });

        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Check Company Request Status for non-Super Admins
        const isSuperAdmin = user.role?.name === 'Super Admin';
        if (!isSuperAdmin && !user.companyId) {
            const request = await prisma.companyRequest.findUnique({ where: { userId: user.id } });
            if (request) {
                if (request.status === 'PENDING') {
                    return res.status(403).json({ success: false, message: 'Your company request is pending Super Admin approval.' });
                }
                if (request.status === 'REJECTED') {
                    return res.status(403).json({ success: false, message: 'Your account/company request has been rejected. Please contact support.' });
                }
            }
            // If no request and no company, they might be new - allow login to reach setup page
        }

        if (!user.isActive) {
            return res.status(401).json({ success: false, message: 'Your account is deactivated.' });
        }

        // Generate Token
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role?.name, companyId: user.companyId },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Format Permissions
        const permissions = user.role?.permissions.map(p => ({
            module: p.module,
            can_view: p.canView ? 1 : 0,
            can_create: p.canCreate ? 1 : 0,
            can_edit: p.canEdit ? 1 : 0,
            can_delete: p.canDelete ? 1 : 0
        })) || [];

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                fullname: user.fullName,
                company_id: user.companyId,
                company_name: user.company?.name,
                role: user.role?.name,
                role_id: user.roleId
            },
            permissions
        });

    } catch (e) { handleError(res, e, "Login Error"); }
});

// ==========================================
// COMPANIES
// ==========================================
app.get('/api/companies', async (req, res) => {
    try {
        const companies = await prisma.company.findMany({ orderBy: { createdAt: 'desc' } });
        res.json(companies);
    } catch (e) { handleError(res, e); }
});

app.get('/api/companies/:id', async (req, res) => {
    try {
        const company = await prisma.company.findUnique({ where: { id: req.params.id } });
        if (!company) return res.status(404).json({ message: 'Company not found' });
        res.json(company);
    } catch (e) { handleError(res, e); }
});

app.post('/api/companies', async (req, res) => {
    try {
        // Handle field mapping if needed (frontend uses underscore, schema uses camelCase mostly, but Prisma maps it if @map is used)
        // Schema has @map("tax_number") so taxNumber or tax_number logic depends on Prisma client input.
        // Prisma Client 'create' expects model field names (camelCase).

        const { name, address, phone, email, tax_no, currency_symbol } = req.body;

        const company = await prisma.company.create({
            data: {
                name,
                address,
                phone,
                email,
                taxNumber: tax_no,
                currency: currency_symbol || 'PKR'
            }
        });
        res.json({ success: true, id: company.id, ...company });
    } catch (e) { handleError(res, e); }
});

app.put('/api/companies/:id', async (req, res) => {
    try {
        const { name, address, phone, email, tax_no, currency_symbol } = req.body;
        const company = await prisma.company.update({
            where: { id: req.params.id },
            data: {
                name,
                address,
                phone,
                email,
                taxNumber: tax_no,
                currency: currency_symbol
            }
        });
        res.json({ success: true, changes: 1 });
    } catch (e) { handleError(res, e); }
});

app.delete('/api/companies/:id', async (req, res) => {
    try {
        await prisma.company.delete({ where: { id: req.params.id } });
        res.json({ success: true, changes: 1 });
    } catch (e) {
        if (e.code === 'P2003') return res.status(400).json({ success: false, message: "Company has active records (users, products, etc) and cannot be deleted" });
        handleError(res, e);
    }
});


// ==========================================
// USERS
// ==========================================

app.get('/', (req, res) => {
    res.send("Hello World")
})
app.get('/api/users', async (req, res) => {
    try {
        const { companyId, activeOnly } = req.query;
        const where = {};
        if (activeOnly === 'true') where.isActive = true;
        if (companyId) where.companyId = companyId;

        const users = await prisma.user.findMany({
            where,
            include: { company: true, role: true },
            orderBy: { createdAt: 'desc' }
        });

        // Transform to match local format expected by frontend if needed
        const mappedUsers = users.map(u => ({
            id: u.id,
            username: u.username,
            fullname: u.fullName,
            role: u.role?.name,
            role_id: u.roleId,
            company_id: u.companyId,
            company_name: u.company?.name,
            is_active: u.isActive ? 1 : 0,
            created_at: u.createdAt
        }));

        res.json(mappedUsers);
    } catch (e) { handleError(res, e); }
});

// ==========================================
// CUSTOMERS
// ==========================================
app.get('/api/customers', async (req, res) => {
    try {
        const { companyId } = req.query;
        if (!companyId) return res.json([]);
        const customers = await prisma.customer.findMany({
            where: { companyId },
            orderBy: { name: 'asc' }
        });
        res.json(customers);
    } catch (e) { handleError(res, e); }
});

app.post('/api/customers', async (req, res) => {
    try {
        const { companyId, name, customerType, phone, email, address, city, cnic, gst_no, creditLimit, openingBalance } = req.body;
        const customer = await prisma.customer.create({
            data: {
                companyId,
                name,
                customerType,
                phone,
                email,
                address,
                city,
                cnic,
                gstNo: gst_no,
                creditLimit: parseFloat(creditLimit) || 0,
                openingBalance: parseFloat(openingBalance) || 0,
                balance: parseFloat(openingBalance) || 0
            }
        });
        res.json({ success: true, id: customer.id, ...customer });
    } catch (e) { handleError(res, e); }
});

app.put('/api/customers/:id', async (req, res) => {
    try {
        const { name, customerType, phone, email, address, city, cnic, gst_no, creditLimit, openingBalance } = req.body;
        await prisma.customer.update({
            where: { id: req.params.id },
            data: {
                name,
                customerType,
                phone,
                email,
                address,
                city,
                cnic,
                gstNo: gst_no,
                creditLimit: parseFloat(creditLimit) || 0,
                openingBalance: parseFloat(openingBalance) || 0
            }
        });
        res.json({ success: true, changes: 1 });
    } catch (e) { handleError(res, e); }
});

app.delete('/api/customers/:id', async (req, res) => {
    try {
        await prisma.customer.delete({ where: { id: req.params.id } });
        res.json({ success: true, changes: 1 });
    } catch (e) {
        if (e.code === 'P2003') return res.status(400).json({ success: false, message: "Customer has transaction history and cannot be deleted" });
        handleError(res, e);
    }
});

// ==========================================
// VENDORS (SUPPLIERS)
// ==========================================
app.get('/api/vendors', async (req, res) => {
    try {
        const { companyId } = req.query;
        if (!companyId) return res.json([]);
        const vendors = await prisma.vendor.findMany({
            where: { companyId },
            orderBy: { name: 'asc' }
        });
        res.json(vendors);
    } catch (e) { handleError(res, e); }
});

app.post('/api/vendors', async (req, res) => {
    try {
        const { companyId, name, company_name, phone, email, address, city, gst_no, openingBalance } = req.body;
        const vendor = await prisma.vendor.create({
            data: {
                companyId,
                name,
                companyName: company_name,
                phone,
                email,
                address,
                city,
                gstNo: gst_no,
                openingBalance: parseFloat(openingBalance) || 0,
                balance: parseFloat(openingBalance) || 0
            }
        });
        res.json({ success: true, id: vendor.id, ...vendor });
    } catch (e) { handleError(res, e); }
});

app.put('/api/vendors/:id', async (req, res) => {
    try {
        const { name, company_name, phone, email, address, city, gst_no, openingBalance } = req.body;
        await prisma.vendor.update({
            where: { id: req.params.id },
            data: {
                name,
                companyName: company_name,
                phone,
                email,
                address,
                city,
                gstNo: gst_no,
                openingBalance: parseFloat(openingBalance) || 0
            }
        });
        res.json({ success: true, changes: 1 });
    } catch (e) { handleError(res, e); }
});

app.delete('/api/vendors/:id', async (req, res) => {
    try {
        await prisma.vendor.delete({ where: { id: req.params.id } });
        res.json({ success: true, changes: 1 });
    } catch (e) {
        if (e.code === 'P2003') return res.status(400).json({ success: false, message: "Supplier has transaction history and cannot be deleted" });
        handleError(res, e);
    }
});

// ==========================================
// PURCHASES
// ==========================================
app.get('/api/purchases', async (req, res) => {
    try {
        const { companyId } = req.query;
        if (!companyId) return res.json([]);
        const purchases = await prisma.purchase.findMany({
            where: { companyId },
            include: { vendor: true, items: { include: { product: true } } },
            orderBy: { date: 'desc' }
        });
        res.json(purchases);
    } catch (e) { handleError(res, e); }
});

app.post('/api/purchases', async (req, res) => {
    try {
        const { companyId, vendorId, invoiceNo, totalAmount, paidAmount, status, items } = req.body;

        const purchase = await prisma.$transaction(async (tx) => {
            // 1. Create Purchase
            const p = await tx.purchase.create({
                data: {
                    companyId,
                    vendorId,
                    invoiceNo,
                    totalAmount: parseFloat(totalAmount),
                    paidAmount: parseFloat(paidAmount) || 0,
                    status: status || 'RECEIVED',
                    items: {
                        create: items.map(item => ({
                            productId: item.productId,
                            quantity: parseInt(item.quantity),
                            unitCost: parseFloat(item.unitCost),
                            total: parseFloat(item.total)
                        }))
                    }
                }
            });

            // 2. Update Product Stock and Cost Price
            for (const item of items) {
                await tx.product.update({
                    where: { id: item.productId },
                    data: {
                        stockQty: { increment: parseInt(item.quantity) },
                        costPrice: parseFloat(item.unitCost) // Update last cost price
                    }
                });
            }

            // 3. Update Vendor Balance (Payable)
            const balanceToIncr = parseFloat(totalAmount) - (parseFloat(paidAmount) || 0);
            if (balanceToIncr !== 0) {
                await tx.vendor.update({
                    where: { id: vendorId },
                    data: { balance: { increment: balanceToIncr } }
                });
            }

            return p;
        });

        res.json({ success: true, id: purchase.id, ...purchase });
    } catch (e) { handleError(res, e); }
});

app.post('/api/users', async (req, res) => {
    try {
        const { company_id, username, password, role, fullname } = req.body;


        const roleMap = {
            'super_admin': 'Super Admin',
            'admin': 'Admin',
            'manager': 'Manager',
            'staff': 'Staff'
        };
        const searchRole = roleMap[role.toLowerCase()] || role;

        let roleRec = await prisma.role.findFirst({
            where: {
                AND: [
                    {
                        OR: [
                            { name: { equals: searchRole, mode: 'insensitive' } },
                            { name: { equals: role, mode: 'insensitive' } }
                        ]
                    },
                    {
                        OR: [
                            { companyId: company_id },
                            { isSystem: true }
                        ]
                    }
                ]
            }
        });

        if (!roleRec) {

            roleRec = await prisma.role.findFirst({
                where: { name: { equals: searchRole, mode: 'insensitive' } }
            });
        }

        if (!roleRec) {
            return res.status(400).json({ success: false, message: `Role '${role}' not found in system` });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                companyId: company_id,
                username,
                password: passwordHash,
                roleId: roleRec.id,
                fullName: fullname,
                isActive: true
            }
        });
        res.json({ success: true, id: user.id });
    } catch (e) {
        if (e.code === 'P2002') return res.json({ success: false, message: 'Username already exists' });
        handleError(res, e);
    }
});

app.put('/api/users/:id', async (req, res) => {
    try {
        const { company_id, username, password, role, fullname, is_active } = req.body;

        let updateData = {
            companyId: company_id,
            username,
            fullName: fullname,
            isActive: is_active === 1 || is_active === true
        };

        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        if (role) {
            const roleMap = {
                'super_admin': 'Super Admin',
                'admin': 'Admin',
                'manager': 'Manager',
                'staff': 'Staff'
            };
            const searchRole = roleMap[role.toLowerCase()] || role;

            const roleRec = await prisma.role.findFirst({
                where: {
                    AND: [
                        {
                            OR: [
                                { name: { equals: searchRole, mode: 'insensitive' } },
                                { name: { equals: role, mode: 'insensitive' } }
                            ]
                        },
                        {
                            OR: [
                                { companyId: company_id },
                                { isSystem: true }
                            ]
                        }
                    ]
                }
            });
            if (roleRec) updateData.roleId = roleRec.id;
        }

        await prisma.user.update({
            where: { id: req.params.id },
            data: updateData
        });
        res.json({ success: true, changes: 1 });
    } catch (e) { handleError(res, e); }
});

app.delete('/api/users/:id', async (req, res) => {
    try {

        await prisma.user.delete({
            where: { id: req.params.id }
        });
        res.json({ success: true, changes: 1, message: "User deleted permanently" });
    } catch (e) {

        if (e.code === 'P2003') {
            await prisma.user.update({
                where: { id: req.params.id },
                data: { isActive: false }
            });
            return res.json({ success: true, changes: 1, message: "User deactivated (contained related records)" });
        }
        handleError(res, e);
    }
});


app.get('/api/roles', async (req, res) => {
    try {
        const { companyId } = req.query;
        const roles = await prisma.role.findMany({
            where: {
                OR: [
                    { companyId: companyId },
                    { isSystem: true }
                ]
            },
            include: { permissions: true },
            orderBy: [{ isSystem: 'desc' }, { name: 'asc' }]
        });
        res.json(roles);
    } catch (e) { handleError(res, e); }
});

app.post('/api/roles', async (req, res) => {
    try {
        const { company_id, name, description, permissions } = req.body;

        const role = await prisma.role.create({
            data: {
                companyId: company_id,
                name,
                description,
                isSystem: false,
                permissions: {
                    create: permissions.map(p => ({
                        module: p.module,
                        canView: p.can_view === 1 || p.can_view === true,
                        canCreate: p.can_create === 1 || p.can_create === true,
                        canEdit: p.can_edit === 1 || p.can_edit === true,
                        canDelete: p.can_delete === 1 || p.can_delete === true
                    }))
                }
            },
            include: { permissions: true }
        });

        res.json({ success: true, id: role.id, ...role });
    } catch (e) { handleError(res, e); }
});

app.put('/api/roles/:id', async (req, res) => {
    try {
        const { name, description, permissions } = req.body;

        // Use a transaction to ensure atomic update of role and its permissions
        const role = await prisma.$transaction(async (tx) => {
            // 1. Update Role basic info
            const updatedRole = await tx.role.update({
                where: { id: req.params.id },
                data: { name, description }
            });

            // 2. Clear old permissions and insert new ones
            if (permissions) {
                await tx.permission.deleteMany({ where: { roleId: req.params.id } });
                await tx.permission.createMany({
                    data: permissions.map(p => ({
                        roleId: req.params.id,
                        module: p.module,
                        canView: p.can_view === 1 || p.can_view === true,
                        canCreate: p.can_create === 1 || p.can_create === true,
                        canEdit: p.can_edit === 1 || p.can_edit === true,
                        canDelete: p.can_delete === 1 || p.can_delete === true
                    }))
                });
            }

            return updatedRole;
        });

        res.json({ success: true, changes: 1 });
    } catch (e) { handleError(res, e); }
});

app.delete('/api/roles/:id', async (req, res) => {
    try {
        // First check if it's a system role
        const role = await prisma.role.findUnique({ where: { id: req.params.id } });
        if (!role || role.isSystem) {
            return res.status(403).json({ success: false, message: "Cannot delete system roles" });
        }

        await prisma.role.delete({ where: { id: req.params.id } });
        res.json({ success: true, changes: 1 });
    } catch (e) { handleError(res, e); }
});

app.get('/api/permissions', async (req, res) => {
    try {
        const { roleId } = req.query;
        if (!roleId) return res.status(400).json({ message: "roleId is required" });

        const permissions = await prisma.permission.findMany({
            where: { roleId }
        });

        // Map to local format if needed
        const mapped = permissions.map(p => ({
            id: p.id,
            role_id: p.roleId,
            module: p.module,
            can_view: p.canView ? 1 : 0,
            can_create: p.canCreate ? 1 : 0,
            can_edit: p.canEdit ? 1 : 0,
            can_delete: p.canDelete ? 1 : 0
        }));

        res.json(mapped);
    } catch (e) { handleError(res, e); }
});

// ==========================================
// INVENTORY (Categories, Brands & Products)
// ==========================================

// --- CATEGORIES ---
app.get('/api/categories', async (req, res) => {
    try {
        const { companyId } = req.query;
        if (!companyId) return res.json([]);
        const categories = await prisma.category.findMany({
            where: { companyId },
            orderBy: { name: 'asc' }
        });
        res.json(categories);
    } catch (e) { handleError(res, e); }
});

app.post('/api/categories', async (req, res) => {
    try {
        const { companyId, name } = req.body;
        const category = await prisma.category.create({
            data: { companyId, name }
        });
        res.json({ success: true, id: category.id });
    } catch (e) { handleError(res, e); }
});

app.put('/api/categories/:id', async (req, res) => {
    try {
        const { name } = req.body;
        await prisma.category.update({
            where: { id: req.params.id },
            data: { name }
        });
        res.json({ success: true, changes: 1 });
    } catch (e) { handleError(res, e); }
});

app.delete('/api/categories/:id', async (req, res) => {
    try {
        await prisma.category.delete({ where: { id: req.params.id } });
        res.json({ success: true, changes: 1 });
    } catch (e) {
        if (e.code === 'P2003') return res.status(400).json({ success: false, message: "Category is in use and cannot be deleted" });
        handleError(res, e);
    }
});

// --- BRANDS ---
app.get('/api/brands', async (req, res) => {
    try {
        const { companyId } = req.query;
        if (!companyId) return res.json([]);
        const brands = await prisma.brand.findMany({
            where: { companyId },
            orderBy: { name: 'asc' }
        });
        res.json(brands);
    } catch (e) { handleError(res, e); }
});

app.post('/api/brands', async (req, res) => {
    try {
        const { companyId, name } = req.body;
        const brand = await prisma.brand.create({
            data: { companyId, name }
        });
        res.json({ success: true, id: brand.id });
    } catch (e) { handleError(res, e); }
});

app.put('/api/brands/:id', async (req, res) => {
    try {
        const { name } = req.body;
        await prisma.brand.update({
            where: { id: req.params.id },
            data: { name }
        });
        res.json({ success: true, changes: 1 });
    } catch (e) { handleError(res, e); }
});

app.delete('/api/brands/:id', async (req, res) => {
    try {
        await prisma.brand.delete({ where: { id: req.params.id } });
        res.json({ success: true, changes: 1 });
    } catch (e) {
        if (e.code === 'P2003') return res.status(400).json({ success: false, message: "Brand is in use and cannot be deleted" });
        handleError(res, e);
    }
});

// --- PRODUCTS ---
app.get('/api/products', async (req, res) => {
    try {
        const { companyId } = req.query;
        if (!companyId) return res.json([]);
        const products = await prisma.product.findMany({
            where: { companyId },
            include: { category: true, brand: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(products);
    } catch (e) { handleError(res, e); }
});

app.post('/api/products', async (req, res) => {
    try {
        const { companyId, name, sku, unit, cost_price, sell_price, stock_qty, alert_qty, weight, expiry_date, category_id, brand_id, image_url, description, color, size, grade, condition } = req.body;
        const product = await prisma.product.create({
            data: {
                companyId,
                name,
                sku,
                unit: unit || 'pcs',
                description,
                costPrice: parseFloat(cost_price) || 0,
                sellPrice: parseFloat(sell_price) || 0,
                stockQty: parseInt(stock_qty) || 0,
                alertQty: parseInt(alert_qty) || 5,
                weight: parseFloat(weight) || 0,
                expiryDate: expiry_date ? new Date(expiry_date) : null,
                categoryId: category_id,
                brandId: brand_id,
                imageUrl: image_url,
                color, size, grade, condition
            }
        });
        res.json({ success: true, id: product.id });
    } catch (e) { handleError(res, e); }
});

app.put('/api/products/:id', async (req, res) => {
    try {
        const { name, sku, unit, cost_price, sell_price, stock_qty, alert_qty, weight, expiry_date, category_id, brand_id, image_url, description, is_active, color, size, grade, condition } = req.body;
        await prisma.product.update({
            where: { id: req.params.id },
            data: {
                name,
                sku,
                unit,
                description,
                costPrice: cost_price !== undefined ? parseFloat(cost_price) : undefined,
                sellPrice: sell_price !== undefined ? parseFloat(sell_price) : undefined,
                stockQty: stock_qty !== undefined ? parseInt(stock_qty) : undefined,
                alertQty: alert_qty !== undefined ? parseInt(alert_qty) : undefined,
                weight: weight !== undefined ? parseFloat(weight) : undefined,
                expiryDate: expiry_date ? new Date(expiry_date) : undefined,
                categoryId: category_id,
                brandId: brand_id,
                imageUrl: image_url,
                isActive: is_active !== undefined ? (is_active === 1 || is_active === true) : undefined,
                color, size, grade, condition
            }
        });
        res.json({ success: true, changes: 1 });
    } catch (e) { handleError(res, e); }
});

app.delete('/api/products/:id', async (req, res) => {
    try {
        await prisma.product.delete({ where: { id: req.params.id } });
        res.json({ success: true, changes: 1 });
    } catch (e) {
        if (e.code === 'P2003') return res.status(400).json({ success: false, message: "Product has transaction history and cannot be deleted" });
        handleError(res, e);
    }
});

// ==========================================
// SALES
// ==========================================
app.get('/api/sales', async (req, res) => {
    try {
        console.log(`[GET /api/sales] Query Params:`, req.query);
        const { companyId } = req.query;
        if (!companyId) {
            console.warn("[GET /api/sales] Missing companyId");
            return res.json([]);
        }
        const sales = await prisma.sale.findMany({
            where: { companyId },
            include: { customer: true, user: true, items: { include: { product: true } } },
            orderBy: { date: 'desc' }
        });
        res.json(sales);
    } catch (e) { handleError(res, e); }
});

app.post('/api/sales', async (req, res) => {
    try {
        const { companyId, customerId, userId, invoiceNo, subTotal, discount, tax, grandTotal, items } = req.body;

        await prisma.$transaction(async (tx) => {
            // 1. Create Sale Record
            const sale = await tx.sale.create({
                data: {
                    companyId,
                    customerId,
                    userId,
                    invoiceNo,
                    subTotal: parseFloat(subTotal),
                    discount: parseFloat(discount) || 0,
                    tax: parseFloat(tax) || 0,
                    grandTotal: parseFloat(grandTotal),
                    items: {
                        create: items.map(item => ({
                            productId: item.productId,
                            quantity: parseInt(item.quantity),
                            price: parseFloat(item.price),
                            total: parseFloat(item.total)
                        }))
                    }
                }
            });

            // 2. Deduct Stock for each item
            for (const item of items) {
                await tx.product.update({
                    where: { id: item.productId },
                    data: {
                        stockQty: { decrement: parseInt(item.quantity) }
                    }
                });
            }

            return sale;
        });

        res.json({ success: true, message: "Sale recorded and stock updated" });
    } catch (e) { handleError(res, e); }
});

// ==========================================
// EXPENSES
// ==========================================
app.get('/api/expenses', async (req, res) => {
    try {
        const { companyId } = req.query;
        if (!companyId) return res.json([]);
        const expenses = await prisma.expense.findMany({
            where: { companyId },
            orderBy: { date: 'desc' }
        });
        res.json(expenses);
    } catch (e) { handleError(res, e); }
});

app.post('/api/expenses', async (req, res) => {
    try {
        const { companyId, title, amount, category, description, date } = req.body;
        const expense = await prisma.expense.create({
            data: {
                companyId,
                title,
                amount: parseFloat(amount),
                category,
                description,
                date: date ? new Date(date) : new Date()
            }
        });
        res.json({ success: true, id: expense.id, ...expense });
    } catch (e) { handleError(res, e); }
});

app.put('/api/expenses/:id', async (req, res) => {
    try {
        const { title, amount, category, description, date } = req.body;
        await prisma.expense.update({
            where: { id: req.params.id },
            data: {
                title,
                amount: amount !== undefined ? parseFloat(amount) : undefined,
                category,
                description,
                date: date ? new Date(date) : undefined
            }
        });
        res.json({ success: true, changes: 1 });
    } catch (e) { handleError(res, e); }
});

app.delete('/api/expenses/:id', async (req, res) => {
    try {
        await prisma.expense.delete({ where: { id: req.params.id } });
        res.json({ success: true, changes: 1 });
    } catch (e) { handleError(res, e); }
});

// ==========================================
// HRM (Employees & Attendance)
// ==========================================
app.get('/api/employees', async (req, res) => {
    try {
        const { companyId } = req.query;
        if (!companyId) return res.json([]);
        const employees = await prisma.employee.findMany({
            where: { companyId },
            include: { attendances: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(employees);
    } catch (e) { handleError(res, e); }
});

app.post('/api/employees', async (req, res) => {
    try {
        const { companyId, firstName, lastName, phone, designation, salary, joiningDate } = req.body;
        const employee = await prisma.employee.create({
            data: {
                companyId,
                firstName,
                lastName,
                phone,
                designation,
                salary: parseFloat(salary) || 0,
                joiningDate: joiningDate ? new Date(joiningDate) : new Date()
            }
        });
        res.json({ success: true, id: employee.id, ...employee });
    } catch (e) { handleError(res, e); }
});

app.put('/api/employees/:id', async (req, res) => {
    try {
        const { firstName, lastName, phone, designation, salary, joiningDate } = req.body;
        await prisma.employee.update({
            where: { id: req.params.id },
            data: {
                firstName,
                lastName,
                phone,
                designation,
                salary: salary !== undefined ? parseFloat(salary) : undefined,
                joiningDate: joiningDate ? new Date(joiningDate) : undefined
            }
        });
        res.json({ success: true, changes: 1 });
    } catch (e) { handleError(res, e); }
});

app.delete('/api/employees/:id', async (req, res) => {
    try {
        await prisma.employee.delete({ where: { id: req.params.id } });
        res.json({ success: true, changes: 1 });
    } catch (e) { handleError(res, e); }
});

// Attendance handles
app.get('/api/attendance', async (req, res) => {
    try {
        const { companyId, date } = req.query;
        const targetDate = date ? new Date(date) : new Date();
        const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
        const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

        const attendance = await prisma.attendance.findMany({
            where: {
                employee: { companyId },
                date: { gte: startOfDay, lte: endOfDay }
            },
            include: { employee: true }
        });
        res.json(attendance);
    } catch (e) { handleError(res, e); }
});

app.post('/api/attendance', async (req, res) => {
    try {
        const { employeeId, status, checkIn, checkOut, date } = req.body;

        // Upsert logic for attendance on a specific day
        const targetDate = date ? new Date(date) : new Date();
        const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
        const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

        const existing = await prisma.attendance.findFirst({
            where: {
                employeeId,
                date: { gte: startOfDay, lte: endOfDay }
            }
        });

        if (existing) {
            await prisma.attendance.update({
                where: { id: existing.id },
                data: { status, checkIn: checkIn ? new Date(checkIn) : undefined, checkOut: checkOut ? new Date(checkOut) : undefined }
            });
        } else {
            await prisma.attendance.create({
                data: {
                    employeeId,
                    status,
                    date: startOfDay,
                    checkIn: checkIn ? new Date(checkIn) : undefined,
                    checkOut: checkOut ? new Date(checkOut) : undefined
                }
            });
        }
        res.json({ success: true });
    } catch (e) { handleError(res, e); }
});

// ==========================================
// REPORTS & ANALYTICS
// ==========================================
app.get('/api/reports/summary', async (req, res) => {
    try {
        const { companyId, startDate, endDate } = req.query;
        const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
        const end = endDate ? new Date(endDate) : new Date();

        const [sales, purchases, expenses] = await Promise.all([
            prisma.sale.findMany({
                where: { companyId, date: { gte: start, lte: end } }
            }),
            prisma.purchase.findMany({
                where: { companyId, date: { gte: start, lte: end } }
            }),
            prisma.expense.findMany({
                where: { companyId, date: { gte: start, lte: end } }
            })
        ]);

        const totalSales = sales.reduce((acc, s) => acc + s.grandTotal, 0);
        const totalPurchases = purchases.reduce((acc, p) => acc + p.totalAmount, 0);
        const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
        const netProfit = totalSales - (totalPurchases + totalExpenses);

        // Calculate Daily Summaries
        const dailyMap = {};

        // Populate with dates in range
        let curr = new Date(start);
        while (curr <= end) {
            const dateStr = curr.toISOString().split('T')[0];
            dailyMap[dateStr] = { date: dateStr, invoices: 0, sales: 0, expenses: 0, purchases: 0, profit: 0 };
            curr.setDate(curr.getDate() + 1);
        }

        sales.forEach(s => {
            const d = s.date.toISOString().split('T')[0];
            if (dailyMap[d]) {
                dailyMap[d].invoices += 1;
                dailyMap[d].sales += s.grandTotal;
                dailyMap[d].profit += s.grandTotal;
            }
        });

        expenses.forEach(e => {
            const d = e.date.toISOString().split('T')[0];
            if (dailyMap[d]) {
                dailyMap[d].expenses += e.amount;
                dailyMap[d].profit -= e.amount;
            }
        });

        purchases.forEach(p => {
            const d = p.date.toISOString().split('T')[0];
            if (dailyMap[d]) {
                dailyMap[d].purchases += p.totalAmount;
                dailyMap[d].profit -= p.totalAmount;
            }
        });

        const recentDays = Object.values(dailyMap).sort((a, b) => b.date.localeCompare(a.date));

        res.json({
            totalSales,
            totalPurchases,
            totalExpenses,
            netProfit,
            salesCount: sales.length,
            purchaseCount: purchases.length,
            expenseCount: expenses.length,
            recentDays
        });
    } catch (e) { handleError(res, e); }
});

// ==========================================
// AUDIT LOGS
// ==========================================
app.get('/api/audit-logs', async (req, res) => {
    try {
        const { companyId, limit = 50 } = req.query;
        // Check if we have an AuditLog model (it's not in schema.prisma yet, let's assume it or add a placeholder)
        // Since it's missing, let's return empty for now or add to schema.
        res.json([]);
    } catch (e) { handleError(res, e); }
});

// ==========================================
// 7. REGISTRATION & APPROVAL FLOW
// ==========================================

// 7.1 Signup (User Registration)
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { username, password, email } = req.body;

        // Check if user exists
        const existingUser = await prisma.user.findUnique({ where: { username } });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Username already taken' });
        }

        // Get 'Admin' role ID (default for new signups)
        const adminRole = await prisma.role.findFirst({
            where: { isSystem: true, name: 'Admin' }
        });

        if (!adminRole) {
            return res.status(500).json({ success: false, message: 'System configuration error: Admin role not found' });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        // Create User (Inactive initially, not linked to company yet)
        const user = await prisma.user.create({
            data: {
                username,
                password: passwordHash,
                email,
                roleId: adminRole.id,
                isActive: true, // User can login but has no company
                fullName: username // Default
            }
        });

        res.json({ success: true, id: user.id, username: user.username });
    } catch (e) { handleError(res, e); }
});

// 7.2 Submit Company Request
app.post('/api/company-requests', async (req, res) => {
    try {
        const { userId, companyName, companyEmail, companyPhone, companyAddress } = req.body;

        // Check if user already has a pending or approved request
        const existingReq = await prisma.companyRequest.findUnique({ where: { userId } });
        if (existingReq) {
            return res.status(400).json({ success: false, message: 'You already have a request submitted.' });
        }

        const request = await prisma.companyRequest.create({
            data: {
                userId,
                companyName,
                companyEmail,
                companyPhone,
                companyAddress,
                status: 'PENDING'
            }
        });

        res.json({ success: true, id: request.id });
    } catch (e) { handleError(res, e); }
});

// 7.3 Get All Requests (Super Admin)
app.get('/api/company-requests', async (req, res) => {
    try {
        const { status } = req.query;
        const where = status ? { status } : {};

        const requests = await prisma.companyRequest.findMany({
            where,
            include: { user: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(requests);
    } catch (e) { handleError(res, e); }
});

// 7.4 Check My Request Status
app.get('/api/company-requests/my-status', async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) return res.status(400).json({ message: 'UserId required' });

        const request = await prisma.companyRequest.findUnique({ where: { userId } });
        if (!request) return res.json({ status: 'NONE' });

        res.json({ status: request.status, companyId: request.user?.companyId }); // If approved, might want companyId logic elsewhere
    } catch (e) { handleError(res, e); }
});

// 7.5 Approve Request
app.post('/api/company-requests/:id/approve', async (req, res) => {
    try {
        const requestId = req.params.id;

        const request = await prisma.companyRequest.findUnique({ where: { id: requestId }, include: { user: true } });
        if (!request) return res.status(404).json({ message: 'Request not found' });
        if (request.status !== 'PENDING') return res.status(400).json({ message: 'Request already processed' });

        // Transaction: Create Company, Update User, Update Request
        await prisma.$transaction(async (tx) => {
            // 1. Create Company
            const company = await tx.company.create({
                data: {
                    name: request.companyName,
                    email: request.companyEmail,
                    phone: request.companyPhone,
                    address: request.companyAddress,
                    currency: 'PKR' // Default
                }
            });

            // 2. Update User (Link to company)
            await tx.user.update({
                where: { id: request.userId },
                data: {
                    companyId: company.id,
                    isActive: true
                }
            });

            // 3. Update Request Status
            await tx.companyRequest.update({
                where: { id: requestId },
                data: { status: 'APPROVED' }
            });

            // 4. (Optional) Create Default Roles/Data for new company if needed? 
            // The system seems to share roles or have system roles. 
            // Assuming 'Admin' role is global system role, which user already has.
        });

        res.json({ success: true, message: 'Company approved and created' });
    } catch (e) { handleError(res, e); }
});

// 7.6 Reject Request
app.post('/api/company-requests/:id/reject', async (req, res) => {
    try {
        const { notes } = req.body;
        const requestId = req.params.id;

        const request = await prisma.companyRequest.findUnique({ where: { id: requestId } });
        if (!request) return res.status(404).json({ message: 'Request not found' });

        await prisma.$transaction([
            prisma.companyRequest.update({
                where: { id: requestId },
                data: { status: 'REJECTED', adminNotes: notes }
            }),
            prisma.user.update({
                where: { id: request.userId },
                data: { isActive: false }
            })
        ]);
        res.json({ success: true, message: 'Request rejected and user deactivated' });
    } catch (e) { handleError(res, e); }
});

// Start Server
if (require.main === module) {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Cloud Server is running on port ${PORT}`);
    });
}

module.exports = app;
