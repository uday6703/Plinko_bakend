const express = require('express');
const router = express.Router();
const { ProvablyFairProtocol } = require('../lib/prng');
const { PlinkoEngine } = require('../lib/engine');

// GET /api/verify - Verify game round
router.get('/', async (req, res) => {
  try {
    const { serverSeed, clientSeed, nonce, dropColumn } = req.query;

    // Validate required parameters
    if (!serverSeed || !clientSeed || !nonce || dropColumn === undefined) {
      return res.status(400).json({ 
        error: 'Missing required parameters: serverSeed, clientSeed, nonce, dropColumn' 
      });
    }

    const dropCol = parseInt(dropColumn);
    if (isNaN(dropCol) || dropCol < 0 || dropCol > 12) {
      return res.status(400).json({ 
        error: 'Drop column must be a number between 0 and 12' 
      });
    }

    // Recompute all values
    const commitHex = ProvablyFairProtocol.createCommitHash(serverSeed, nonce);
    const combinedSeed = ProvablyFairProtocol.generateCombinedSeed(serverSeed, clientSeed, nonce);
    
    // Replay the game
    const gameResult = PlinkoEngine.playRound(
      serverSeed,
      clientSeed, 
      nonce,
      dropCol,
      12, // ROWS
      100 // Bet amount doesn't affect outcome
    );

    // Verify commitment
    const commitValid = ProvablyFairProtocol.verifyCommit(serverSeed, nonce, commitHex);

    res.json({
      // Input values
      serverSeed,
      clientSeed,
      nonce,
      dropColumn: dropCol,
      
      // Computed values
      commitHex,
      combinedSeed,
      pegMapHash: gameResult.pegMapHash,
      binIndex: gameResult.binIndex,
      payoutMultiplier: gameResult.payoutMultiplier,
      
      // Game data for replay
      pegMap: gameResult.pegMap,
      path: gameResult.path,
      
      // Verification
      commitValid,
      
      // Additional info
      rows: 12,
    });

  } catch (error) {
    console.error('Error verifying round:', error);
    res.status(500).json({ error: 'Failed to verify round' });
  }
});

module.exports = router;