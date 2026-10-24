import { NextRequest, NextResponse } from "next/server";
import { signFingerprint, type MillId } from "@/lib/solana/proof";

/** A demo mill registers a certificate fingerprint on Solana devnet. Body: { hash, mill: 1|2|3 } */
export async function POST(req: NextRequest) {
  try {
    const { hash, mill } = (await req.json()) as { hash?: string; mill?: number };
    if (typeof hash !== "string" || !/^[0-9a-f]{64}$/.test(hash)) {
      return NextResponse.json({ success: false, error: "Invalid fingerprint" }, { status: 400 });
    }
    if (mill !== 1 && mill !== 2 && mill !== 3) {
      return NextResponse.json({ success: false, error: "Unknown demo mill" }, { status: 400 });
    }
    const result = await signFingerprint(hash, mill as MillId);
    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Solana signing failed";
    return NextResponse.json({ success: false, error: msg }, { status: 502 });
  }
}
