const { getPrismaClient } = require('../config/prisma');

async function pingDatabase() {
  const prisma = getPrismaClient();
  await prisma.$queryRaw`SELECT 1`;
}

module.exports = {
  pingDatabase,
};
