const db = require('./database/db_manager');

async function cleanupAndPull() {
    console.log("Cleaning up local database (Users, Roles, Permissions)...");

    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run("BEGIN TRANSACTION");

            // Clear users, roles, permissions
            db.run("DELETE FROM users");
            db.run("DELETE FROM roles");
            db.run("DELETE FROM permissions");
            // Clear deletions tracking to avoid conflicts
            db.run("DELETE FROM pending_sync_deletions");

            db.run("COMMIT", (err) => {
                if (err) {
                    console.error("Cleanup failed:", err);
                    reject(err);
                } else {
                    console.log("✓ Local cleanup successful.");
                    resolve();
                }
            });
        });
    });
}

cleanupAndPull().then(() => {
    console.log("Database cleared. Please restart the app or trigger a pull.");
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
