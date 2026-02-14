const db = require("./database/db_manager");
db.all("PRAGMA table_info(sale_returns)", (err, rows) => {
    console.log("SALE_RETURNS columns:");
    rows.forEach(r => console.log(`- ${r.name} (${r.type})`));

    db.all("SELECT date FROM sale_returns LIMIT 5", (err, samples) => {
        console.log("Sample dates:", samples);
        process.exit(0);
    });
});
