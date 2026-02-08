// Quick script to fix user company_id in cloud database
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixUserCompany() {
    try {
        // Get user talhaa
        const user = await prisma.user.findFirst({
            where: { username: 'talhaa' }
        });

        if (!user) {
            console.log('❌ User talhaa not found!');
            return;
        }

        console.log('Found user:', {
            id: user.id,
            username: user.username,
            currentCompanyId: user.companyId
        });

        // If company_id is null, assign the correct one
        if (!user.companyId) {
            const correctCompanyId = 'cmkntaqig0005az3m8nkz0s3e'; // From your logs

            await prisma.user.update({
                where: { id: user.id },
                data: { companyId: correctCompanyId }
            });

            console.log('✅ User company_id updated to:', correctCompanyId);
        } else {
            console.log('✅ User already has company_id:', user.companyId);
        }

        // Also fix permissions without company_id
        const permissionsFixed = await prisma.permission.updateMany({
            where: { companyId: null },
            data: { companyId: 'cmkntaqig0005az3m8nkz0s3e' }
        });

        console.log(`✅ Fixed ${permissionsFixed.count} permissions`);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

fixUserCompany();
