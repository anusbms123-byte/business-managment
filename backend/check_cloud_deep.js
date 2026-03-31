const axios = require('axios');

const CLOUD_URL = 'https://business-managment-gamma.vercel.app/api';
const COMPANY_ID = 'cmlorzg040001pqe9f89imr84';

async function checkCloudRolesDeep() {
    console.log(`Deep Checking Roles for Company: ${COMPANY_ID} on Cloud...`);

    try {
        const rolesResponse = await axios.get(`${CLOUD_URL}/roles?companyId=${COMPANY_ID}`);
        const roles = rolesResponse.data;

        const targetRole = roles.find(r => r.name === 'han bhai');

        if (!targetRole) {
            console.log("Role 'han bhai' not found.");
            return;
        }

        console.log(`Found Role: ${targetRole.name}`);
        console.log("Full Role Object from Cloud:");
        console.log(JSON.stringify(targetRole, null, 2));

    } catch (error) {
        console.error("Error:", error.message);
    }
}

checkCloudRolesDeep();
