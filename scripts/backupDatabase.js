/**
 * backupDatabase.js - This file is part of the NOB web project.
 * 
 * Database backup utility script. Creates separate backups of database structure
 * and data using mysqldump with timestamped filenames.
 * 
 * Created: 11/2025
 * Authors: Pero & Github Copilot
 */

const { exec } = require('child_process');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') }); // Load .env file

// Database connection configuration from .env
const DB_CONFIG = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
};

// Folder to store backups
const BACKUP_FOLDER = path.join(__dirname, '../src/db/backups');

// Get the current date in YYYY-MM-DD format
const currentDate = new Date().toISOString().split('T')[0];

// Backup file names
const structureBackupFile = path.join(BACKUP_FOLDER, `nob_db_struct_bak_${currentDate}.sql`);
const dataBackupFile = path.join(BACKUP_FOLDER, `nob_db_sdata_bak_${currentDate}.sql`);

// Function to execute a shell command
function executeCommand(command, description) {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error during ${description}:`, error.message);
                reject(error);
            } else {
                console.log(`${description} completed successfully.`);
                resolve(stdout);
            }
        });
    });
}

async function backupDatabase() {
    try {
        // Ensure the backup folder exists
        console.log('Ensuring backup folder exists...');
        require('fs').mkdirSync(BACKUP_FOLDER, { recursive: true });

        // Properly escape the database name and file paths
        const databaseName = DB_CONFIG.database;
        const structureFilePath = `"${structureBackupFile}"`;
        const dataFilePath = `"${dataBackupFile}"`;

        // Command to dump the database structure
        const structureCommand = `mysqldump --host="${DB_CONFIG.host}" --user="${DB_CONFIG.user}" --password="${DB_CONFIG.password}" --no-data "${databaseName}" > ${structureFilePath}`;
        await executeCommand(structureCommand, 'Database structure backup');

        // Command to dump the database data
        const dataCommand = `mysqldump --host="${DB_CONFIG.host}" --user="${DB_CONFIG.user}" --password="${DB_CONFIG.password}" --no-create-info "${databaseName}" > ${dataFilePath}`;
        await executeCommand(dataCommand, 'Database data backup');

        console.log('Database backup completed successfully.');
        console.log(`Structure backup: ${structureBackupFile}`);
        console.log(`Data backup: ${dataBackupFile}`);
    } catch (error) {
        console.error('Database backup failed:', error.message);
    }
}

backupDatabase();
