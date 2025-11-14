const { ProvablyFairProtocol, XORShift32 } = require('./lib/prng.js');

// Test vectors from assignment
const serverSeed = 'b2a5f3f32a4d9c6ee7a8c1d33456677890abcdeffedcba0987654321ffeeddcc';
const nonce = '42';
const clientSeed = 'candidate-hello';

console.log('=== Testing Assignment Vectors ===');
const commitHex = ProvablyFairProtocol.createCommitHash(serverSeed, nonce);
console.log('CommitHex Expected: bb9acdc67f3f18f3345236a01f0e5072596657a9005c7d8a22cff061451a6b34');
console.log('CommitHex Actual  :', commitHex);
console.log('CommitHex Match   :', commitHex === 'bb9acdc67f3f18f3345236a01f0e5072596657a9005c7d8a22cff061451a6b34');

const combinedSeed = ProvablyFairProtocol.generateCombinedSeed(serverSeed, clientSeed, nonce);
console.log('CombinedSeed Expected: e1dddf77de27d395ea2be2ed49aa2a59bd6bf12ee8d350c16c008abd406c07e0');
console.log('CombinedSeed Actual  :', combinedSeed);
console.log('CombinedSeed Match   :', combinedSeed === 'e1dddf77de27d395ea2be2ed49aa2a59bd6bf12ee8d350c16c008abd406c07e0');

// Test PRNG
const { RoundRNG } = require('./lib/prng.js');
const prng = new RoundRNG(combinedSeed);
const expectedValues = [0.1106166649, 0.7625129214, 0.0439292176, 0.4578678815, 0.3438999297];
console.log('\n=== PRNG Values ===');
for (let i = 0; i < 5; i++) {
  const actual = prng.next();
  const expected = expectedValues[i];
  const match = Math.abs(actual - expected) < 0.0000001;
  console.log(`PRNG[${i}] Expected: ${expected}, Actual: ${actual.toFixed(10)}, Match: ${match}`);
}