/**
 * Try the Solana proof end to end from the terminal (DEVNET).
 *
 *   npx tsx scripts/solana-demo.ts                 -> uses a built-in demo certificate text
 *   npx tsx scripts/solana-demo.ts path/to/cert.pdf -> uses your own file
 *
 * It (1) registers the file's fingerprint as Demo Mill 1, (2) verifies the original file,
 * and (3) verifies a copy with ONE character changed, which should fail.
 */
import { readFileSync } from "node:fs";
import { fingerprint, signFingerprint, verifyFingerprint } from "../src/lib/solana/proof";

process.loadEnvFile(".env.local");

async function main() {
  const path = process.argv[2];
  const original: Buffer = path
    ? readFileSync(path)
    : Buffer.from(
        `DEMO MILL TEST CERTIFICATE (SAMPLE - NOT A REAL DOCUMENT)\nMill: Demo Mill 1\nHeat No: DM-24-${Date.now()}\nGrade: ASTM A36\nC 0.18  Mn 0.85  P 0.012  S 0.008\n`,
      );

  const hash = fingerprint(original);
  console.log(`\n1) Fingerprint of ${path ?? "demo certificate"}:\n   ${hash}`);

  console.log("\n2) Demo Mill 1 signs it onto Solana devnet (takes a few seconds)...");
  const signed = await signFingerprint(hash, 1);
  console.log(`   ✅ Signed. See it live: ${signed.explorerUrl}`);

  console.log("\n3) Verifying the ORIGINAL file...");
  const ok = await verifyFingerprint(hash, signed.millAddress);
  console.log(`   Result: ${ok.status === "mill-signed" ? "✅ mill-signed, unchanged" : "❌ " + ok.status}`);

  const tampered = Buffer.from(original);
  tampered[tampered.length - 2] = tampered[tampered.length - 2] ^ 1; // flip one tiny bit
  console.log("\n4) Verifying a copy with ONE character changed...");
  const bad = await verifyFingerprint(fingerprint(tampered), signed.millAddress);
  console.log(`   Result: ${bad.status === "mill-signed" ? "⚠️ unexpectedly matched" : "🚩 not registered — file was altered"}\n`);
}

main().catch((err) => {
  console.error("\n❌ Error:", err.message ?? err);
  process.exit(1);
});
