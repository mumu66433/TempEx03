require('dotenv').config();

process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:./dev.db';

module.exports = {
  host: process.env.HOST || '0.0.0.0',
  port: Number(process.env.PORT || 3000),
  databaseUrl: process.env.DATABASE_URL,
};
