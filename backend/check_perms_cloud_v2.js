const axios = require('axios');

const CLOUD_URL = 'https://business-managment-gamma.vercel.app/api';
const COMPANY_ID = 'cmlorzg040001pqe9f89imr84';

async function checkCloudPermissions() {
    console.log(`Checking Roles for Company: ${COMPANY_ID} on Cloud...`);

    try {
        const rolesResponse = await axios.get(`${CLOUD_URL}/roles?companyId=${COMPANY_ID}`);
        const roles = rolesResponse.data;

        if (!Array.isArray(roles)) {
            console.log("Response:", roles);
            return;
        }

        const targetRole = roles.find(r => r.name === 'han bhai' || r.id === 'cmlrp2wph000hlabmg2w0srt1');

        if (!targetRole) {
            console.log("Role 'han bhai' (cmlrp2wph000hlabmg2w0srt1) not found for this company on cloud.");
            console.log("Available roles on cloud for this company:");
            roles.forEach(r => console.log(`- ${r.name} (${r.id})`));
            return;
        }

        console.log(`\nFound Role '${targetRole.name}' with ID: ${targetRole.id}`);

        let permissions = targetRole.permissions;

        if (Array.isArray(permissions) && permissions.length > 0) {
            console.log("\nPermissions on Cloud:");
            permissions.forEach(p => {
                const perms = [];
                if (p.canView) perms.push("View");
                if (p.canCreate) perms.push("Create");
                if (p.canEdit) perms.push("Edit");
                if (p.canDelete) perms.push("Delete");

                if (perms.length > 0) {
                    console.log(`- ${p.module}: ${perms.join(", ")}`);
                }
            });
        } else {
            console.log("No active permissions found for this role on cloud.");
        }

    } catch (error) {
        console.error("Error:", error.message);
        if (error.response) console.log("Status:", error.response.status, error.response.data);
    }
}

checkCloudPermissions();
