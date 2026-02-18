const axios = require('axios');

const CLOUD_URL = 'https://businessdevelopment-ten.vercel.app/api';

async function checkCloudPermissions() {
    console.log("Checking Roles and Permissions on Cloud Database...");

    try {
        // First get all roles to find 'han bhai'
        console.log("Fetching roles from cloud...");
        const rolesResponse = await axios.get(`${CLOUD_URL}/roles`);
        const roles = rolesResponse.data;

        if (!Array.isArray(roles)) {
            console.error("Failed to fetch roles or invalid response format.");
            return;
        }

        const targetRole = roles.find(r => r.name === 'han bhai');

        if (!targetRole) {
            console.log("Role 'han bhai' not found on cloud.");
            return;
        }

        console.log(`\nFound Role 'han bhai' with ID: ${targetRole.id}`);

        // Now find permissions for this role
        // The API might return permissions nested in the role or via a separate endpoint
        // Based on sync_service.js, the /roles endpoint might return nested permissions

        let permissions = targetRole.permissions;

        // If not nested, try to fetch from /roles/:id if it exists or use some other logic
        if (!permissions) {
            console.log("Permissions not found in roles response, checking if they are in the list anyway...");
            // Some APIs return all roles including permissions if asked or by default
        }

        if (Array.isArray(permissions) && permissions.length > 0) {
            console.log("\nPermissions for role 'han bhai' on Cloud:");
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
            console.log("No active permissions found for 'han bhai' on cloud.");
        }

    } catch (error) {
        console.error("Error connecting to cloud API:", error.message);
    }
}

checkCloudPermissions();
