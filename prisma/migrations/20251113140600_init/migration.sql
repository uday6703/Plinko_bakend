-- CreateTable
CREATE TABLE "Round" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "commitHex" TEXT NOT NULL,
    "serverSeed" TEXT,
    "clientSeed" TEXT NOT NULL,
    "combinedSeed" TEXT NOT NULL,
    "pegMapHash" TEXT NOT NULL,
    "rows" INTEGER NOT NULL,
    "dropColumn" INTEGER NOT NULL,
    "binIndex" INTEGER NOT NULL,
    "payoutMultiplier" REAL NOT NULL,
    "betCents" INTEGER NOT NULL,
    "pathJson" TEXT NOT NULL,
    "revealedAt" DATETIME
);
