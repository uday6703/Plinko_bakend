const { PrismaClient } = require('@prisma/client');

// Create Prisma client instance
const prisma = global.prisma || new PrismaClient();

// Prevent multiple instances in development
if (process.env.NODE_ENV === 'development') {
  global.prisma = prisma;
}

module.exports = prisma;