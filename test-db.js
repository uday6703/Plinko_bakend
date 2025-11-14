const { PrismaClient } = require('@prisma/client');

async function testDatabase() {
  const prisma = new PrismaClient();
  
  try {
    // Test database connection
    console.log('Testing SQLite database connection...');
    
    // Try to create a test round
    const testRound = await prisma.round.create({
      data: {
        status: 'CREATED',
        nonce: 'test-nonce-123',
        commitHex: 'abc123def456',
        clientSeed: 'test-client-seed',
        combinedSeed: 'test-combined-seed',
        pegMapHash: 'test-peg-map-hash',
        rows: 12,
        dropColumn: 6,
        binIndex: 6,
        payoutMultiplier: 1.5,
        betCents: 100,
        pathJson: '[]'
      }
    });
    
    console.log('✅ SQLite database working! Created test round:', testRound.id);
    
    // Count rounds
    const count = await prisma.round.count();
    console.log('✅ Total rounds in database:', count);
    
    // Clean up test data
    await prisma.round.delete({
      where: { id: testRound.id }
    });
    
    console.log('✅ Test cleanup completed');
    console.log('✅ SQLite database is fully operational!');
    
  } catch (error) {
    console.error('❌ Database error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();