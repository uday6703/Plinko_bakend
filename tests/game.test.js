const { PlinkoEngine, ROWS, BINS } = require('../lib/engine');
const { ProvablyFairProtocol, RoundRNG, XORShift32 } = require('../lib/prng');

describe('Provably Fair Protocol', () => {
  // Assignment test vectors
  const serverSeed = 'b2a5f3f32a4d9c6ee7a8c1d33456677890abcdeffedcba0987654321ffeeddcc';
  const nonce = '42';
  const clientSeed = 'candidate-hello';

  test('should generate correct commit hash', () => {
    const commitHex = ProvablyFairProtocol.createCommitHash(serverSeed, nonce);
    expect(commitHex).toBe('bb9acdc67f3f18f3345236a01f0e5072596657a9005c7d8a22cff061451a6b34');
  });

  test('should generate correct combined seed', () => {
    const combinedSeed = ProvablyFairProtocol.generateCombinedSeed(serverSeed, clientSeed, nonce);
    expect(combinedSeed).toBe('e1dddf77de27d395ea2be2ed49aa2a59bd6bf12ee8d350c16c008abd406c07e0');
  });

  test('should verify commit correctly', () => {
    const commitHex = 'bb9acdc67f3f18f3345236a01f0e5072596657a9005c7d8a22cff061451a6b34';
    const isValid = ProvablyFairProtocol.verifyCommit(serverSeed, nonce, commitHex);
    expect(isValid).toBe(true);
  });
});

describe('PRNG (XORShift32)', () => {
  test('should match assignment test vectors', () => {
    const combinedSeed = 'e1dddf77de27d395ea2be2ed49aa2a59bd6bf12ee8d350c16c008abd406c07e0';
    const rng = new RoundRNG(combinedSeed);
    
    const expectedValues = [0.1106166649, 0.7625129214, 0.0439292176, 0.4578678815, 0.3438999297];
    
    for (let i = 0; i < expectedValues.length; i++) {
      const actual = rng.next();
      expect(actual).toBeCloseTo(expectedValues[i], 10);
    }
  });

  test('should be deterministic', () => {
    const combinedSeed = 'test-seed-123';
    const rng1 = new RoundRNG(combinedSeed);
    const rng2 = new RoundRNG(combinedSeed);
    
    for (let i = 0; i < 10; i++) {
      expect(rng1.next()).toBe(rng2.next());
    }
  });

  test('should reset properly', () => {
    const combinedSeed = 'test-seed-456';
    const rng = new RoundRNG(combinedSeed);
    
    const firstSequence = [];
    for (let i = 0; i < 5; i++) {
      firstSequence.push(rng.next());
    }
    
    rng.reset(combinedSeed);
    
    for (let i = 0; i < 5; i++) {
      expect(rng.next()).toBe(firstSequence[i]);
    }
  });
});

describe('Plinko Engine', () => {
  test('should match assignment test vector outcome', () => {
    const serverSeed = 'b2a5f3f32a4d9c6ee7a8c1d33456677890abcdeffedcba0987654321ffeeddcc';
    const clientSeed = 'candidate-hello';
    const nonce = '42';
    const dropColumn = 6; // center drop
    const betCents = 100;

    const result = PlinkoEngine.playRound(serverSeed, clientSeed, nonce, dropColumn, ROWS, betCents);
    
    expect(result.binIndex).toBe(6);
    expect(result.rows).toBe(12);
    expect(result.path).toHaveLength(12);
  });

  test('should generate correct peg map format', () => {
    const combinedSeed = 'test-peg-seed';
    const rng = new RoundRNG(combinedSeed);
    const pegMap = PlinkoEngine.generatePegMap(rng, ROWS);
    
    expect(pegMap).toHaveLength(ROWS);
    
    for (let row = 0; row < ROWS; row++) {
      expect(pegMap[row]).toHaveLength(row + 1);
      
      for (let peg = 0; peg <= row; peg++) {
        const bias = pegMap[row][peg];
        expect(bias).toBeGreaterThanOrEqual(0.4);
        expect(bias).toBeLessThanOrEqual(0.6);
        // Should be rounded to 6 decimal places
        expect(bias.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(6);
      }
    }
  });

  test('should produce deterministic path', () => {
    const serverSeed = 'test-server-seed';
    const clientSeed = 'test-client-seed';
    const nonce = '123';
    const dropColumn = 3;
    const betCents = 50;

    const result1 = PlinkoEngine.playRound(serverSeed, clientSeed, nonce, dropColumn, ROWS, betCents);
    const result2 = PlinkoEngine.playRound(serverSeed, clientSeed, nonce, dropColumn, ROWS, betCents);
    
    expect(result1.binIndex).toBe(result2.binIndex);
    expect(result1.pegMapHash).toBe(result2.pegMapHash);
    expect(result1.path).toEqual(result2.path);
  });

  test('should handle edge drop columns', () => {
    const serverSeed = 'edge-test-seed';
    const clientSeed = 'edge-client';
    const nonce = '999';
    const betCents = 100;

    // Test left edge
    const leftResult = PlinkoEngine.playRound(serverSeed, clientSeed, nonce, 0, ROWS, betCents);
    expect(leftResult.binIndex).toBeGreaterThanOrEqual(0);
    expect(leftResult.binIndex).toBeLessThanOrEqual(BINS - 1);

    // Test right edge
    const rightResult = PlinkoEngine.playRound(serverSeed, clientSeed, nonce, 12, ROWS, betCents);
    expect(rightResult.binIndex).toBeGreaterThanOrEqual(0);
    expect(rightResult.binIndex).toBeLessThanOrEqual(BINS - 1);
  });

  test('should generate symmetric payout table', () => {
    const multipliers = PlinkoEngine.getPayoutMultipliers(BINS);
    
    expect(multipliers).toHaveLength(BINS);
    
    // Should be symmetric
    for (let i = 0; i < BINS; i++) {
      const symmetric = BINS - 1 - i;
      expect(multipliers[i]).toBe(multipliers[symmetric]);
    }
    
    // Center should have lowest multiplier
    const centerIndex = Math.floor(BINS / 2);
    const centerMultiplier = multipliers[centerIndex];
    
    for (let i = 0; i < BINS; i++) {
      if (i !== centerIndex) {
        expect(multipliers[i]).toBeGreaterThanOrEqual(centerMultiplier);
      }
    }
  });
});

describe('Integration Tests', () => {
  test('complete round workflow', () => {
    // Simulate full round workflow
    const serverSeed = ProvablyFairProtocol.generateServerSeed();
    const nonce = ProvablyFairProtocol.generateNonce();
    const clientSeed = 'integration-test-client';
    const dropColumn = 6;
    const betCents = 200;

    // 1. Create commit
    const commitHex = ProvablyFairProtocol.createCommitHash(serverSeed, nonce);
    expect(commitHex).toMatch(/^[a-f0-9]{64}$/);

    // 2. Play round
    const result = PlinkoEngine.playRound(serverSeed, clientSeed, nonce, dropColumn, ROWS, betCents);
    
    expect(result).toHaveProperty('binIndex');
    expect(result).toHaveProperty('pegMapHash');
    expect(result).toHaveProperty('path');
    expect(result).toHaveProperty('payoutMultiplier');
    expect(result).toHaveProperty('payoutCents');

    // 3. Verify commit
    const isValidCommit = ProvablyFairProtocol.verifyCommit(serverSeed, nonce, commitHex);
    expect(isValidCommit).toBe(true);

    // 4. Verify round is replayable
    const replayResult = PlinkoEngine.playRound(serverSeed, clientSeed, nonce, dropColumn, ROWS, betCents);
    expect(replayResult.binIndex).toBe(result.binIndex);
    expect(replayResult.pegMapHash).toBe(result.pegMapHash);
  });
});