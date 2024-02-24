require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

module.exports = {
    query: (text, params) => {
        console.log('sent query:', text);
        return pool.query(text, params);
    }
};