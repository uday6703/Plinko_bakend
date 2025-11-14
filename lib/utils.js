/**
 * Utility functions
 */

/**
 * Format cents as currency
 */
function formatCents(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Generate client seed
 */
function generateClientSeed() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

module.exports = {
  formatCents,
  generateClientSeed
};