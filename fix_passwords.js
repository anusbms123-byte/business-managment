const db = require('./backend/database/db_manager');

(async () => {
    console.log("Starting local database fix for raw_password...");
    try {
        await new Promise((resolve, reject) => {
            db.serialize(() => {
                // Find users where raw_password is null but password column has plain text (doesn't start with bcrypt hash prefix $2b$)
                db.run(`
                    UPDATE users 
                    SET raw_password = password, sync_status = 'pending'
                    WHERE (raw_password IS NULL OR raw_password = '') 
                    AND password IS NOT NULL 
                    AND password NOT LIKE '$2b$%'
                `, function(err) {
                    if (err) reject(err);
                    else {
                        console.log(`Updated ${this.changes} users with plain text passwords.`);
                        resolve();
                    }
                });
            });
        });
        console.log("Fix completed successfully.");
    } catch (err) {
        console.error("Fix failed:", err.message);
    } finally {
        // We don't close db here as it's a shared manager usually
        process.exit(0);
    }
})();
