const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database...');

    // 1. Create System Roles & Permissions
    const systemRoles = [
        {
            name: 'Super Admin',
            description: 'Full system management access',
            isSystem: true,
            modules: ['users', 'company', 'settings']
        },
        {
            name: 'Admin',
            description: 'Full company access',
            isSystem: true,
            allModules: true
        },
        {
            name: 'Manager',
            description: 'Management level access',
            isSystem: true,
            allModules: true
        },
    ];

    const allModules = [
        'dashboard', 'sales', 'purchase', 'products', 'inventory',
        'customers', 'suppliers', 'expenses', 'reports', 'users',
        'roles', 'settings', 'hrm', 'returns', 'backup', 'company'
    ];

    console.log('Cleaning up old system roles...');
    // Cascade delete permissions via schema relation onDelete: Cascade
    await prisma.role.deleteMany({
        where: {
            isSystem: true,
            companyId: null
        }
    });

    for (const role of systemRoles) {
        console.log(`Creating Role: ${role.name}`);
        const dbRole = await prisma.role.create({
            data: {
                name: role.name,
                description: role.description,
                isSystem: true,
                companyId: null // System role
            }
        });

        const allowedModules = role.allModules ? allModules : (role.modules || []);

        // Define Permissions
        for (const module of allModules) {
            const isAllowed = allowedModules.includes(module);

            await prisma.permission.create({
                data: {
                    roleId: dbRole.id,
                    module: module,
                    canView: isAllowed,
                    canCreate: isAllowed,
                    canEdit: isAllowed,
                    canDelete: isAllowed
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
    if (!superAdminRole) throw new Error("Super Admin role was not created!");

    const passwordHash = await bcrypt.hash('admin123', 10);

    const superAdmin = await prisma.user.upsert({
        where: { username: 'superadmin' },
        update: {
            roleId: superAdminRole.id,
            companyId: null
        },
        create: {
            username: 'superadmin',
            password: passwordHash,
            fullName: 'System Owner',
            companyId: null,
            roleId: superAdminRole.id
        }
    });

    console.log(`Super Admin User: ${superAdmin.username} ready with role: ${superAdminRole.name}.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
