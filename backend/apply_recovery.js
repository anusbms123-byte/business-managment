const fs = require('fs');
const path = require('path');

const dbDir = path.join(__dirname, 'database');
const dbFile = path.join(dbDir, 'business.db');
const recoveredFile = path.join(dbDir, 'business_recovered.db');
const timestamp = Date.now();
const backupFile = path.join(dbDir, `business.db.corrupted_${timestamp}`);

console.log('Starting recovery application...');

try {
    // 1. Rename corrupted db to backup
    if (fs.existsSync(dbFile)) {
        console.log(`Backing up corrupted database to: ${backupFile}`);
        fs.renameSync(dbFile, backupFile);
    }

    // 2. Clear WAL and SHM files if they exist (they belong to the corrupted db)
    const walFile = dbFile + '-wal';
    const shmFile = dbFile + '-shm';
    if (fs.existsSync(walFile)) {
        console.log('Removing old WAL file');
        fs.unlinkSync(walFile);
    }
    if (fs.existsSync(shmFile)) {
        console.log('Removing old SHM file');
        fs.unlinkSync(shmFile);
    }

    // 3. Move recovered to main
    if (fs.existsSync(recoveredFile)) {
        console.log(`Promoting ${recoveredFile} to ${dbFile}`);
        fs.copyFileSync(recoveredFile, dbFile);
        // We use copy instead of rename just in case, but rename is fine too.
        // Actually rename is better to clean up.
        // fs.renameSync(recoveredFile, dbFile);
    } else {
        console.error('Recovered file not found!');
        process.exit(1);
    }

    console.log('✓ Recovery applied successfully.');
} catch (err) {
    console.error('!!! Error during recovery application:', err.message);
    if (err.code === 'EBUSY' || err.code === 'EPERM') {
        console.error('The database file is currently locked by another process (likely the Electron app).');
        console.error('Please CLOSE the application/error dialog first and then try again.');
    }
    process.exit(1);
}
