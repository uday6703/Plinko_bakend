const { PlinkoEngine } = require('./lib/engine.js');

// Test vectors from assignment
const serverSeed = 'b2a5f3f32a4d9c6ee7a8c1d33456677890abcdeffedcba0987654321ffeeddcc';
const nonce = '42';
const clientSeed = 'candidate-hello';
const dropColumn = 6; // center drop
const rows = 12;
const betCents = 100;

console.log('=== Testing Engine with Assignment Vectors ===');
const result = PlinkoEngine.playRound(serverSeed, clientSeed, nonce, dropColumn, rows, betCents);

console.log('Drop Column:', dropColumn);
console.log('Expected Bin:', 6);
console.log('Actual Bin  :', result.binIndex);
console.log('Bin Match   :', result.binIndex === 6);

console.log('\nPeg Map Preview (first 3 rows):');
console.log('Row 0:', result.pegMap[0]);
console.log('Row 1:', result.pegMap[1]); 
console.log('Row 2:', result.pegMap[2]);

console.log('\nExpected Peg Values:');
console.log('Row 0: [0.422123]');
console.log('Row 1: [0.552503, 0.408786]');
console.log('Row 2: [0.491574, 0.468780, 0.436540]');

console.log('\nPayout Multiplier:', result.payoutMultiplier);
console.log('Payout Amount:', result.payoutCents, 'cents');
console.log('PegMap Hash:', result.pegMapHash);