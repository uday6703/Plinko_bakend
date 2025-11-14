const express = require('express');
const router = express.Router();
const prisma = require('../lib/db');
const { ProvablyFairProtocol } = require('../lib/prng');
const { PlinkoEngine, ROWS } = require('../lib/engine');

// POST /api/rounds/commit - Create a new round commitment
router.post('/commit', async (req, res) => {
  try {
    // Generate server-side randomness
    const serverSeed = ProvablyFairProtocol.generateServerSeed();
    const nonce = ProvablyFairProtocol.generateNonce();
    
    // Create commitment hash
    const commitHex = ProvablyFairProtocol.createCommitHash(serverSeed, nonce);

    // Create new round in database with CREATED status
    const round = await prisma.round.create({
      data: {
        status: 'CREATED',
        nonce,
        commitHex,
        serverSeed, // Store server seed for later reveal
        clientSeed: '', // Will be provided when starting the round
        combinedSeed: '', // Will be generated when starting
        pegMapHash: '', // Will be computed when starting
        rows: 12,
        dropColumn: 0, // Will be set when starting
        binIndex: 0, // Will be computed when starting
        payoutMultiplier: 0, // Will be computed when starting
        betCents: 0, // Will be set when starting
        pathJson: '[]', // Will be populated when starting
      },
    });

    // Return commitment information (do not reveal server seed yet)
    res.json({
      roundId: round.id,
      commitHex,
      nonce,
    });

  } catch (error) {
    console.error('Error creating round commitment:', error);
    res.status(500).json({ error: 'Failed to create round commitment' });
  }
});

// POST /api/rounds/:id/start - Start a round with client inputs
router.post('/:id/start', async (req, res) => {
  try {
    const { id } = req.params;
    const { clientSeed, betCents, dropColumn } = req.body;

    // Validate inputs
    if (!clientSeed || typeof clientSeed !== 'string') {
      return res.status(400).json({ error: 'Valid client seed required' });
    }

    if (!betCents || betCents < 1) {
      return res.status(400).json({ error: 'Valid bet amount required' });
    }

    if (dropColumn < 0 || dropColumn > ROWS) {
      return res.status(400).json({ error: 'Invalid drop column' });
    }

    // Find the round
    const round = await prisma.round.findUnique({
      where: { id },
    });

    if (!round) {
      return res.status(404).json({ error: 'Round not found' });
    }

    if (round.status !== 'CREATED') {
      return res.status(400).json({ error: 'Round already started' });
    }

    // Play the game
    const result = PlinkoEngine.playRound(
      round.serverSeed,
      clientSeed,
      round.nonce,
      dropColumn,
      ROWS,
      betCents
    );

    // Update round with game results
    const updatedRound = await prisma.round.update({
      where: { id },
      data: {
        status: 'STARTED',
        clientSeed,
        combinedSeed: result.combinedSeed,
        pegMapHash: result.pegMapHash,
        dropColumn,
        binIndex: result.binIndex,
        payoutMultiplier: result.payoutMultiplier,
        betCents,
        pathJson: JSON.stringify(result.path),
      },
    });

    // Return game result (without revealing server seed yet)
    res.json({
      roundId: updatedRound.id,
      status: updatedRound.status,
      nonce: updatedRound.nonce,
      commitHex: updatedRound.commitHex,
      clientSeed: updatedRound.clientSeed,
      combinedSeed: updatedRound.combinedSeed,
      pegMapHash: updatedRound.pegMapHash,
      dropColumn: updatedRound.dropColumn,
      binIndex: updatedRound.binIndex,
      payoutMultiplier: updatedRound.payoutMultiplier,
      betCents: updatedRound.betCents,
      pegMap: result.pegMap,
      path: result.path,
      winAmount: result.payoutCents,
    });

  } catch (error) {
    console.error('Error starting round:', error);
    res.status(500).json({ error: 'Failed to start round' });
  }
});

// POST /api/rounds/:id/reveal - Reveal server seed for verification
router.post('/:id/reveal', async (req, res) => {
  try {
    const { id } = req.params;

    // Find the round
    const round = await prisma.round.findUnique({
      where: { id },
    });

    if (!round) {
      return res.status(404).json({ error: 'Round not found' });
    }

    if (round.status !== 'STARTED' && round.status !== 'REVEALED') {
      return res.status(400).json({ error: 'Round not ready for reveal' });
    }

    // Update round status to revealed (if not already revealed)
    const revealedRound = round.status === 'REVEALED' ? round : await prisma.round.update({
      where: { id },
      data: {
        status: 'REVEALED',
        revealedAt: new Date(),
      },
    });

    // Return revealed information
    res.json({
      roundId: revealedRound.id,
      serverSeed: revealedRound.serverSeed,
      clientSeed: revealedRound.clientSeed,
      nonce: revealedRound.nonce,
      commitHex: revealedRound.commitHex,
      combinedSeed: revealedRound.combinedSeed,
      revealedAt: revealedRound.revealedAt,
    });

  } catch (error) {
    console.error('Error revealing round:', error);
    res.status(500).json({ error: 'Failed to reveal round' });
  }
});

// GET /api/rounds/:id - Get round details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const round = await prisma.round.findUnique({
      where: { id },
    });

    if (!round) {
      return res.status(404).json({ error: 'Round not found' });
    }

    res.json(round);

  } catch (error) {
    console.error('Error fetching round:', error);
    res.status(500).json({ error: 'Failed to fetch round' });
  }
});

module.exports = router;