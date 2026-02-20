const axios = require('axios');

async function testRoleCreation() {
    const url = 'http://localhost:2000/api/roles';

    // 11 Permissions Payload
    const payload = {
        name: "Test Role 11 Permissions",
        description: "Testing strict permission sync",
        companyId: "cmlorzg040001pqe9f89imr84", // Using ID from your logs
        isSystem: false,
        permissions: [
            { module: "dashboard", canView: true, canCreate: false, canEdit: false, canDelete: false },
            { module: "sales", canView: true, canCreate: true, canEdit: false, canDelete: false },
            { module: "purchase", canView: true, canCreate: false, canEdit: false, canDelete: false },
            { module: "returns", canView: true, canCreate: false, canEdit: false, canDelete: false },
            { module: "products", canView: true, canCreate: true, canEdit: true, canDelete: true },
            // New Modules (The ones allegedly failing)
            { module: "inventory", canView: true, canCreate: false, canEdit: false, canDelete: false },
            { module: "customers", canView: true, canCreate: true, canEdit: false, canDelete: false },
            { module: "suppliers", canView: true, canCreate: false, canEdit: false, canDelete: false },
            { module: "expenses", canView: true, canCreate: false, canEdit: false, canDelete: false },
            { module: "reports", canView: true, canCreate: false, canEdit: false, canDelete: false },
            { module: "users", canView: true, canCreate: true, canEdit: true, canDelete: true }
        ]
    };

    console.log(`--- SENDING REQUEST TO ${url} ---`);
    console.log(`Payload contains ${payload.permissions.length} permissions.`);

    try {
        const response = await axios.post(url, payload);
        console.log("\n--- RESPONSE FROM SERVER ---");
        console.log("Status:", response.status);
        if (response.data.success) {
            console.log("Role Created ID:", response.data.id);
            const savedPerms = response.data.permissions || [];
            console.log(`Server returned ${savedPerms.length} permissions.`);

            if (savedPerms.length === payload.permissions.length) {
                console.log("SUCCESS: All permissions saved!");
            } else {
                console.log("FAILURE: Count mismatch!");
                console.log("Saved Modules:", savedPerms.map(p => p.module).join(', '));
            }
        } else {
            console.log("Server responded with success: false", response.data);
        }
    } catch (error) {
        console.error("Request Failed:", error.message);
        if (error.response) {
            console.error("Data:", error.response.data);
        }
    }
}

testRoleCreation();
