const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database...');

    // 1. Create System Roles & Permissions
    const systemRoles = [
        { name: 'Super Admin', description: 'Full system access', isSystem: true },
        { name: 'Admin', description: 'Full company access', isSystem: true },
        { name: 'Manager', description: 'Management level access', isSystem: true },
        { name: 'Cashier', description: 'Basic sales access', isSystem: true },
    ];

    const modules = ['dashboard', 'sales', 'purchase', 'products', 'inventory',
        'customers', 'suppliers', 'expenses', 'reports', 'users', 'settings', 'hrm', 'accounting', 'returns'];

    for (const role of systemRoles) {
        // Upsert Role (Update if exists, Create if not)
        // Since we don't have unique name yet (multi-tenant), we look for system roles with same name where companyId is null
        // But for simplicity in seed, we can just delete old system roles or check existence.
        // Let's check existence first.

        // Find existing system role
        let dbRole = await prisma.role.findFirst({
            where: {
                name: role.name,
                isSystem: true,
                companyId: null
            }
        });

        if (!dbRole) {
            console.log(`Creating Role: ${role.name}`);
            dbRole = await prisma.role.create({
                data: {
                    name: role.name,
                    description: role.description,
                    isSystem: true,
                    companyId: null // System role
                }
            });
        } else {
            console.log(`Role ${role.name} already exists. Updating permissions...`);
        }

        // Delete existing permissions for this role to reset/update
        await prisma.permission.deleteMany({ where: { roleId: dbRole.id } });

        // Define Permissions
        for (const module of modules) {
            let perms = { view: true, create: false, edit: false, delete: false };

            if (role.name === 'Super Admin' || role.name === 'Admin') {
                perms = { view: true, create: true, edit: true, delete: true };
            } else if (role.name === 'Manager') {
                perms = { view: true, create: true, edit: true, delete: false };
                if (module === 'users' || module === 'settings') {
                    perms = { view: true, create: false, edit: false, delete: false };
                }
            } else if (role.name === 'Cashier') {
                perms = { view: true, create: false, edit: false, delete: false };
                if (module === 'sales') {
                    perms = { view: true, create: true, edit: false, delete: false };
                }
                if (module === 'users' || module === 'settings') {
                    perms = { view: false, create: false, edit: false, delete: false };
                }
            }

            await prisma.permission.create({
                data: {
                    roleId: dbRole.id,
                    module: module,
                    canView: perms.view,
                    canCreate: perms.create,
                    canEdit: perms.edit,
                    canDelete: perms.delete
                }
            });
        }
    }

    // 2. Create Default Company (Main Tenant)
    let company = await prisma.company.findFirst({ where: { name: 'Main Company' } });
    if (!company) {
        console.log('Creating Main Company...');
        company = await prisma.company.create({
            data: {
                name: 'Main Company',
                address: 'Cloud Server',
                phone: '000-000-0000',
                email: 'admin@bms.com',
                currency: 'PKR'
            }
        });
    }

    // 3. Create Super Admin User
    const superAdminRole = await prisma.role.findFirst({ where: { name: 'Super Admin', isSystem: true } });
    const passwordHash = await bcrypt.hash('admin123', 10);

    const superAdmin = await prisma.user.upsert({
        where: { username: 'superadmin' },
        update: {
            // Update role if changed
            roleId: superAdminRole.id,
        },
        create: {
            username: 'superadmin',
            password: passwordHash,
            fullName: 'System Owner',
            companyId: null,
            roleId: superAdminRole.id
        }
    });

    console.log(`Super Admin User: ${superAdmin.username} ready.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
