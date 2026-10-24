import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { verifyFingerprint } from "@/lib/solana/proof";

/** Checks whether a mill's wallet registered this fingerprint. Body: { hash, millAddress } */
export async function POST(req: NextRequest) {
  try {
    const { hash, millAddress } = (await req.json()) as { hash?: string; millAddress?: string };
    if (typeof hash !== "string" || !/^[0-9a-f]{64}$/.test(hash)) {
      return NextResponse.json({ success: false, error: "Invalid fingerprint" }, { status: 400 });
    }
    try {
      new PublicKey(millAddress ?? "");
    } catch {
      return NextResponse.json({ success: false, error: "Invalid mill address" }, { status: 400 });
    }
    const result = await verifyFingerprint(hash, millAddress as string);
    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Solana lookup failed";
    return NextResponse.json({ success: false, error: msg }, { status: 502 });
  }
}
