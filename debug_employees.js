const db = require('./backend/database/db_manager');
(async () => {
    try {
        const info = await db.asyncAll("PRAGMA table_info(employees)");
        console.log("Employees Table Info:", JSON.stringify(info, null, 2));
        const employees = await db.asyncAll("SELECT * FROM employees LIMIT 5");
        console.log("Employees Data Sample:", JSON.stringify(employees, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
