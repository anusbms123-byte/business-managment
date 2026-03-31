const syncService = require('../services/sync_service');
const axios = require('axios');
require('dotenv').config();

// Default to local cloud server if Vercel is failing, 
// or let user specify via CLOUD_URL env var
const CLOUD_URL = process.env.CLOUD_URL || 'https://business-managment-gamma.vercel.app/api';

async function pullCompaniesAndUsers() {
    console.log(`Starting data pull from: ${CLOUD_URL}`);

    try {
        // 1. Pull Companies
        console.log('Fetching companies...');
        const companiesRes = await axios.get(`${CLOUD_URL}/companies`);
        const companies = companiesRes.data;
        console.log(`Found ${companies.length} companies.`);

        for (const company of companies) {
            console.log(`Syncing company: ${company.name} (${company.id})`);
            await syncService.upsertLocalRecord('companies', company);

            // 2. Pull Roles for this company
            console.log(`Fetching roles for ${company.name}...`);
            const rolesRes = await axios.get(`${CLOUD_URL}/roles?companyId=${company.id}`);
            const roles = rolesRes.data;
            console.log(`Found ${roles.length} roles.`);
            for (const role of roles) {
                await syncService.upsertLocalRecord('roles', role);
            }

            // Permissions are included in roles, so we don't fetch separately


            // 4. Pull Users for this company
            console.log(`Fetching users for ${company.name}...`);
            const usersRes = await axios.get(`${CLOUD_URL}/users?companyId=${company.id}`);
            const users = usersRes.data;
            console.log(`Found ${users.length} users.`);

            for (const user of users) {
                await syncService.upsertLocalRecord('users', {
                    id: user.id,
                    username: user.username,
                    fullName: user.fullName || user.fullname,
                    role: user.role?.name || user.role,
                    roleId: user.roleId || user.role_id,
                    companyId: user.company_id || user.companyId
                });
            }
        }

        console.log('\n✅ Initial pull of Companies and Users completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Pull failed:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.error('Hint: Make sure your cloud-server is running on port 2000.');
        }
        process.exit(1);
    }
}

pullCompaniesAndUsers();
