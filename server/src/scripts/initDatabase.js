const { ensureDatabaseSchema } = require('../services/databaseInitService');
const { getPrismaClient } = require('../config/prisma');

(async () => {
  try {
    await ensureDatabaseSchema();
    console.log('Database schema initialized.');
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    const prisma = getPrismaClient();
    await prisma.$disconnect();
  }
})();
