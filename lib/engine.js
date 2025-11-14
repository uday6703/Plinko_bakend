const { createHash } = require('crypto');
const { RoundRNG } = require('./prng');

// Game configuration constants
const ROWS = 12;
const BINS = ROWS + 1;

/**
 * Deterministic Plinko Engine
 * Implements exact Daphnis Labs MVP specifications
 */
class PlinkoEngine {
  /**
   * Generate deterministic peg map with leftBias ∈ [0.4, 0.6]
   * Formula: leftBias = 0.5 + (rand() - 0.5) * 0.2
   */
  static generatePegMap(rng, rows) {
    const pegMap = [];

    for (let row = 0; row < rows; row++) {
      const pegRow = [];
      
      // Row r has r+1 pegs (0-indexed)
      for (let peg = 0; peg <= row; peg++) {
        // Generate leftBias using specified formula
        const randomValue = rng.next();
        const leftBias = 0.5 + (randomValue - 0.5) * 0.2;
        
        // Round to 6 decimal places for stable hashing
        const roundedBias = Math.round(leftBias * 1000000) / 1000000;
        pegRow.push(roundedBias);
      }
      
      pegMap.push(pegRow);
    }

    return pegMap;
  }

  /**
   * Create SHA256 hash of peg map for verification
   */
  static createPegMapHash(pegMap) {
    return createHash('sha256')
      .update(JSON.stringify(pegMap))
      .digest('hex');
  }

  /**
   * Simulate ball drop following deterministic path
   * Uses discrete model: maintain pos (number of Right moves)
   */
  static simulateDrop(rng, pegMap, dropColumn) {
    const path = [];
    let pos = 0; // Number of Right moves so far
    
    // Drop column adjustment: adj = (dropColumn - floor(R/2)) * 0.01
    const adj = (dropColumn - Math.floor(ROWS / 2)) * 0.01;

    for (let row = 0; row < ROWS; row++) {
      // Get peg at index min(pos, row) (peg under current path)
      const pegIndex = Math.min(pos, row);
      const leftBias = pegMap[row][pegIndex];
      
      // Apply drop column adjustment: bias' = clamp(leftBias + adj, 0, 1)
      const adjustedBias = Math.max(0, Math.min(1, leftBias + adj));
      
      // Get random value for decision
      const randomValue = rng.next();
      
      // Decision: if rnd < bias' choose Left, else Right
      const direction = randomValue < adjustedBias ? 'left' : 'right';
      
      // Update position
      if (direction === 'right') {
        pos += 1;
      }
      
      // Record path step
      path.push({
        row,
        column: pos,
        direction,
        pegBias: leftBias,
        randomValue,
        adjustedBias
      });
    }

    return path;
  }

  /**
   * Get payout multipliers for all bins (symmetric)
   */
  static getPayoutMultipliers(bins) {
    // Simple symmetric paytable - higher multipliers at edges
    const multipliers = [];
    const center = Math.floor(bins / 2);
    
    for (let i = 0; i < bins; i++) {
      const distance = Math.abs(i - center);
      // Edge bins get higher multipliers
      const multiplier = 0.5 + (distance * 0.3);
      multipliers.push(Math.round(multiplier * 100) / 100);
    }
    
    return multipliers;
  }

  /**
   * Play complete round with full deterministic outcome
   */
  static playRound(serverSeed, clientSeed, nonce, dropColumn, rows, betCents) {
    // Create combined seed: SHA256(serverSeed + ":" + clientSeed + ":" + nonce)
    const combinedSeed = createHash('sha256')
      .update(`${serverSeed}:${clientSeed}:${nonce}`)
      .digest('hex');
    
    // Initialize RNG with combined seed
    const rng = new RoundRNG(combinedSeed);
    
    // Generate peg map (first use of RNG stream)
    const pegMap = this.generatePegMap(rng, rows);
    const pegMapHash = this.createPegMapHash(pegMap);
    
    // Simulate ball drop (continued use of RNG stream)
    const path = this.simulateDrop(rng, pegMap, dropColumn);
    
    // Final bin index is the final position (number of right moves)
    const binIndex = path[path.length - 1].column;
    
    // Calculate payout
    const multipliers = this.getPayoutMultipliers(BINS);
    const payoutMultiplier = multipliers[binIndex];
    const payoutCents = Math.round(betCents * payoutMultiplier);

    return {
      pegMap,
      pegMapHash,
      path,
      binIndex,
      payoutMultiplier,
      payoutCents,
      rows,
      combinedSeed
    };
  }
}

module.exports = {
  PlinkoEngine,
  ROWS,
  BINS
};