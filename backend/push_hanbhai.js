const https = require('https');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const url = require('url');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const CLOUD_URL = process.env.CLOUD_URL || 'https://businessdevelopment-ten.vercel.app/api';
const dbPath = path.join(__dirname, 'database', 'business.db');
const db = new sqlite3.Database(dbPath);

function apiCall(method, apiPath, data) {
    return new Promise((resolve, reject) => {
        const fullUrl = CLOUD_URL + apiPath;
        const parsedUrl = url.parse(fullUrl);
        const options = {
            hostname: parsedUrl.hostname,
            path: parsedUrl.path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(JSON.stringify(data))
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    resolve({ success: false, message: body });
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.write(JSON.stringify(data));
        req.end();
    });
}

async function pushRole() {
    db.get("SELECT * FROM roles WHERE name = 'han bhai'", async (err, role) => {
        if (!role) {
            console.log("Role not found");
            db.close();
            return;
        }

        db.all("SELECT * FROM permissions WHERE role_id = ? OR role_id = ?", [role.global_id, String(role.id)], async (err, perms) => {
            const uniquePerms = {};
            perms.forEach(p => {
                uniquePerms[p.module] = {
                    module: p.module,
                    canView: p.can_view === 1,
                    canCreate: p.can_create === 1,
                    canEdit: p.can_edit === 1,
                    canDelete: p.can_delete === 1
                };
            });

            const payload = {
                name: role.name,
                description: role.description,
                companyId: role.company_id,
                permissions: Object.values(uniquePerms)
            };

            console.log("Pushing payload with", payload.permissions.length, "permissions");

            try {
                const result = await apiCall('PUT', `/roles/${role.global_id}`, payload);
                console.log("Result Success:", result.success);
                if (result.role) {
                    console.log("Permissions count on cloud response:", result.role.permissions?.length);
                    console.log("Cloud permissions modules:", result.role.permissions.map(p => p.module).join(', '));
                } else {
                    console.log("Cloud response:", JSON.stringify(result));
                }
            } catch (error) {
                console.error("Push failed:", error.message);
            }
            db.close();
        });
    });
}

pushRole();
