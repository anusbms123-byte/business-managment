const db = require("./database/db_manager");
db.all("SELECT sale_date FROM sales LIMIT 5", (err, samples) => {
    console.log("Sales sample dates:", samples);
    process.exit(0);
});
