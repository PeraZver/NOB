const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

module.exports = {
    // Server configuration
    server: {
        port: process.env.PORT || 3000
    },
    
    // Database configuration
    database: {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        connectTimeout: 10000
    },
    
    // Paths configuration
    paths: {
        public: path.join(__dirname, '../../public'),
        assets: path.join(__dirname, '../../public/assets')
    }
};
