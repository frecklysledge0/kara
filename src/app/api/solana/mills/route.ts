import { NextResponse, connection } from "next/server";
import { DEMO_MILLS, millAddress } from "@/lib/solana/proof";

/** Lists the demo mills and their PUBLIC wallet addresses (never secrets). */
export async function GET() {
  await connection(); // read env at request time, not build time
  try {
    const mills = DEMO_MILLS.map((m) => ({ ...m, address: millAddress(m.id) }));
    return NextResponse.json({ success: true, network: "devnet", mills });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Solana demo mills are not configured";
    return NextResponse.json({ success: false, error: msg }, { status: 503 });
  }
}
