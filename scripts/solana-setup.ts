/**
 * One-time setup for MillProof's Solana proof (DEVNET ONLY — free test network, no real money).
 *
 * Creates:
 *   - 1 "fee payer" wallet (pays the tiny network fees; the only one that needs test SOL)
 *   - 3 demo "mill" wallets (they sign certificate fingerprints; they need no SOL)
 * Saves their secret keys into .env.local (which is git-ignored) and prints the public addresses.
 *
 * Run once:   npx tsx scripts/solana-setup.ts
 */
import { Keypair } from "@solana/web3.js";
import { existsSync, readFileSync, appendFileSync } from "node:fs";

const ENV_FILE = ".env.local";
const existing = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, "utf8") : "";

if (existing.includes("SOLANA_PAYER_SECRET")) {
  console.log("Solana keys already exist in .env.local — not creating new ones.");
  process.exit(0);
}

const toSecret = (k: Keypair) => JSON.stringify(Array.from(k.secretKey));
const payer = Keypair.generate();
const mills = [Keypair.generate(), Keypair.generate(), Keypair.generate()];

appendFileSync(
  ENV_FILE,
  [
    "",
    "# --- Solana (DEVNET demo only, never commit) ---",
    'SOLANA_RPC_URL="https://api.devnet.solana.com"',
    `SOLANA_PAYER_SECRET="${toSecret(payer)}"`,
    ...mills.map((m, i) => `SOLANA_MILL_${i + 1}_SECRET="${toSecret(m)}"`),
    "",
  ].join("\n"),
);

console.log("\n✅ Saved 4 demo wallets to .env.local\n");
console.log("FEE PAYER address (fund this one with test SOL):");
console.log("   " + payer.publicKey.toBase58() + "\n");
mills.forEach((m, i) => console.log(`Demo mill ${i + 1} address: ${m.publicKey.toBase58()}`));
console.log("\nNext: go to https://faucet.solana.com, choose Devnet, paste the FEE PAYER address, request SOL.\n");