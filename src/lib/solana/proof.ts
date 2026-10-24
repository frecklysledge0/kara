/**
 * MillProof — Solana "mill-signed fingerprint" proof (DEVNET demo).
 *
 * What this does, in plain English:
 *  - A certificate's fingerprint is its SHA-256 hash (the same hash the upload flow already stores
 *    as `document_sha256`). Change one character in the file and the fingerprint changes completely.
 *  - signFingerprint(): a demo mill wallet writes "millproof:v1:<fingerprint>" onto Solana using the
 *    built-in Memo program. The mill's wallet must sign, so only that mill can create the record.
 *  - verifyFingerprint(): looks through that mill's Solana history for the same fingerprint.
 *      found      -> "mill-signed": this exact file was registered by that mill's wallet
 *      not found  -> "not-registered": edited after issue, or never registered by that mill
 *
 * Honest limit: this proves the file is unchanged since the mill registered it. It does NOT prove
 * the steel itself matches the paper, and the 3 mills here are demo wallets on devnet.
 * Server-only: reads secret keys from environment variables. Never import this into a client component.
 */
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import crypto from "node:crypto";

/** Solana's built-in Memo program (writes a short text note into a transaction). */
const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
const MEMO_PREFIX = "millproof:v1:";

export type MillId = 1 | 2 | 3;

export interface SignResult {
  signature: string;
  millAddress: string;
  explorerUrl: string;
}

export interface VerifyResult {
  status: "mill-signed" | "not-registered";
  millAddress: string;
  signature?: string;
  signedAt?: string; // ISO date
  explorerUrl?: string;
}

/** SHA-256 fingerprint as lowercase hex — matches lib/supabase/storage.ts. */
export function fingerprint(data: Buffer | Uint8Array | string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function readKeypair(envName: string): Keypair {
  const raw = process.env[envName];
  if (!raw) throw new Error(`Missing ${envName}. Run: npx tsx scripts/solana-setup.ts`);
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
}

function connection(): Connection {
  return new Connection(process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com", "confirmed");
}

export function millKeypair(mill: MillId): Keypair {
  return readKeypair(`SOLANA_MILL_${mill}_SECRET`);
}

export function millAddress(mill: MillId): string {
  return millKeypair(mill).publicKey.toBase58();
}

export function explorerTxUrl(signature: string): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
}

/** The demo mill registers a certificate fingerprint on Solana. The fee payer covers the fee. */
export async function signFingerprint(hash: string, mill: MillId): Promise<SignResult> {
  if (!/^[0-9a-f]{64}$/.test(hash)) throw new Error("Fingerprint must be a 64-character SHA-256 hex string");
  const payer = readKeypair("SOLANA_PAYER_SECRET");
  const millKp = millKeypair(mill);

  const memo = new TransactionInstruction({
    programId: MEMO_PROGRAM_ID,
    // Listing the mill as a signer means the memo is only valid if the mill's key signed it.
    keys: [{ pubkey: millKp.publicKey, isSigner: true, isWritable: false }],
    data: Buffer.from(MEMO_PREFIX + hash, "utf8"),
  });

  const tx = new Transaction().add(memo);
  tx.feePayer = payer.publicKey;
  const signature = await sendAndConfirmTransaction(connection(), tx, [payer, millKp]);

  return { signature, millAddress: millKp.publicKey.toBase58(), explorerUrl: explorerTxUrl(signature) };
}

/** Checks whether this mill's wallet ever registered this exact fingerprint. */
export async function verifyFingerprint(hash: string, millAddressBase58: string): Promise<VerifyResult> {
  const mill = new PublicKey(millAddressBase58);
  const history = await connection().getSignaturesForAddress(mill, { limit: 1000 });
  const wanted = MEMO_PREFIX + hash;

  // Solana returns each memo as text like "[77] millproof:v1:<hash>".
  const match = history.find((h) => !h.err && typeof h.memo === "string" && h.memo.includes(wanted));
  if (!match) return { status: "not-registered", millAddress: millAddressBase58 };

  return {
    status: "mill-signed",
    millAddress: millAddressBase58,
    signature: match.signature,
    signedAt: match.blockTime ? new Date(match.blockTime * 1000).toISOString() : undefined,
    explorerUrl: explorerTxUrl(match.signature),
  };
}
