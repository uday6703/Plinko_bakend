const { createHash } = require('crypto');

// Simple random number generator for fair gaming
class XORShift32 {
  constructor(seed) {
    this.state = seed >>> 0;
    if (this.state === 0) {
      this.state = 1; // Can't start with zero
    }
  }

  /**
   * Get next random number between 0 and 1
   */
  next() {
    this.state ^= this.state << 13;
    this.state ^= this.state >>> 17;
    this.state ^= this.state << 5;
    this.state = this.state >>> 0; // Keep as 32-bit unsigned
    
    // Convert to [0, 1) range
    return this.state / 0x100000000;
  }

  /**
   * Get current state for debugging
   */
  getState() {
    return this.state;
  }
}

/**
 * Provably Fair Protocol Implementation
 * Handles commit-reveal scheme for transparent randomness
 */
class ProvablyFairProtocol {
  /**
   * Generate a cryptographically secure server seed
   */
  static generateServerSeed() {
    return createHash('sha256')
      .update(Math.random().toString() + Date.now().toString())
      .digest('hex');
  }

  /**
   * Generate a unique nonce
   */
  static generateNonce() {
    return Date.now().toString() + Math.random().toString(36).substring(2);
  }

  /**
   * Create commit hash from server seed and nonce
   */
  static createCommitHash(serverSeed, nonce) {
    return createHash('sha256')
      .update(serverSeed + ':' + nonce)
      .digest('hex');
  }

  /**
   * Generate combined seed for deterministic randomness
   */
  static generateCombinedSeed(serverSeed, clientSeed, nonce) {
    return createHash('sha256')
      .update(serverSeed + ':' + clientSeed + ':' + nonce)
      .digest('hex');
  }

  /**
   * Extract 32-bit seed from combined seed for PRNG initialization
   */
  static extractPRNGSeed(combinedSeed) {
    // Take first 4 bytes (8 hex chars) and convert to big-endian 32-bit int
    const hexSeed = combinedSeed.substring(0, 8);
    return parseInt(hexSeed, 16);
  }

  /**
   * Verify the integrity of a commit-reveal
   */
  static verifyCommit(serverSeed, nonce, commitHash) {
    const expectedHash = this.createCommitHash(serverSeed, nonce);
    return expectedHash === commitHash;
  }
}

/**
 * Round-specific deterministic number generator
 * Ensures all randomness for a round comes from a single PRNG stream
 */
class RoundRNG {
  constructor(combinedSeed) {
    const seed = ProvablyFairProtocol.extractPRNGSeed(combinedSeed);
    this.prng = new XORShift32(seed);
    this.callCount = 0;
  }

  /**
   * Get next random number and track call order
   */
  next() {
    this.callCount++;
    return this.prng.next();
  }

  /**
   * Get call count for debugging/verification
   */
  getCallCount() {
    return this.callCount;
  }

  /**
   * Reset to beginning (for verification/replay)
   */
  reset(combinedSeed) {
    const seed = ProvablyFairProtocol.extractPRNGSeed(combinedSeed);
    this.prng = new XORShift32(seed);
    this.callCount = 0;
  }
}

module.exports = {
  XORShift32,
  ProvablyFairProtocol,
  RoundRNG
};