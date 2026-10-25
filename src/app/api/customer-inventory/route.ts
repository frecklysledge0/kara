import { NextResponse } from "next/server";
import { connection } from "next/server";
import { fetchCustomerInventory } from "@/lib/engine/customer-inventory";

export async function GET() {
  await connection();
  try {
    return NextResponse.json({ listings: await fetchCustomerInventory() }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Inventory could not be loaded." }, { status: 503 });
  }
}
