const db = require('./database/db_manager');

(async () => {
    try {
        console.log("Cleaning up 'cached_password' from local database...");
        const result = await db.asyncRun("UPDATE users SET password = NULL WHERE password = 'cached_password'");
        console.log(`Updated ${result.changes} records.`);
        process.exit(0);
    } catch (err) {
        console.error("Cleanup failed:", err);
        process.exit(1);
    }
})();
