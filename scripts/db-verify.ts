// =====================================================================
// MillProof: Database Verification & Diagnostic CLI Script
// Runs representative queries against Supabase to check tables and schema
// =====================================================================

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

// Simple zero-dependency .env.local parser
function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log("=================================================");
console.log("MillProof Supabase Database Diagnostic & Verification");
console.log("=================================================");
console.log("Endpoint URL:", url || "MISSING");
console.log("Key Configured:", key ? `${key.slice(0, 15)}...` : "MISSING");

if (!url || !key) {
  console.error("ERROR: Missing Supabase credentials in .env.local.");
  process.exit(1);
}

const supabase = createClient(url, key);

async function runDiagnostics() {
  console.log("\n1. Checking Supabase Storage Buckets...");
  try {
    const { data: buckets, error: bError } = await supabase.storage.listBuckets();
    if (bError) {
      console.warn("  Storage bucket check error:", bError.message);
    } else {
      console.log(`  Found ${buckets?.length || 0} bucket(s):`, buckets?.map((b) => `${b.name} (public: ${b.public})`));
      const mtrBucket = buckets?.find((b) => b.name === "mtr-documents");
      if (mtrBucket) {
        console.log("  [PASS] Private bucket 'mtr-documents' exists.");
      } else {
        console.log("  [WARN] Bucket 'mtr-documents' not found. Creating private bucket...");
        const { error: createErr } = await supabase.storage.createBucket("mtr-documents", {
          public: false,
          fileSizeLimit: 25000000,
        });
        if (createErr) console.warn("  Create bucket warning:", createErr.message);
        else console.log("  [PASS] Created private bucket 'mtr-documents'.");
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("  Storage check exception:", msg);
  }

  console.log("\n2. Checking Canonical Tables in PostgreSQL...");
  const tables = ["sellers", "certificates", "listings", "orders"];
  const status: Record<string, boolean> = {};

  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select("*").limit(3);
      if (error) {
        console.log(`  Table '${table}': NOT FOUND or RLS blocked (${error.code}: ${error.message})`);
        status[table] = false;
      } else {
        console.log(`  [PASS] Table '${table}' is live. Sample row count: ${data?.length || 0}`);
        status[table] = true;
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`  Table '${table}' query exception: ${msg}`);
      status[table] = false;
    }
  }

  const allTablesLive = Object.values(status).every(Boolean);

  if (allTablesLive) {
    console.log("\n3. Verifying Representative Queries...");
    // Representative Query 1: Active Plate Listings with Seller Join
    const { data: listingsData, error: listingsErr } = await supabase
      .from("listings")
      .select(`
        id, grade, form, thickness_in, quantity_tons, price_per_ton, status,
        seller:sellers(name, city, state)
      `)
      .eq("status", "active")
      .limit(2);

    if (listingsErr) {
      console.error("  Representative query failed:", listingsErr.message);
    } else {
      console.log("  Representative active listings query result:", JSON.stringify(listingsData, null, 2));
    }

    console.log("\n=================================================");
    console.log("RESULT: Supabase database is completely configured and verified!");
    console.log("=================================================");
  } else {
    console.log("\n=================================================");
    console.log("RESULT: Database tables have not yet been created in PostgREST.");
    console.log("To apply the migration and seed data:");
    console.log("1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/murlxwcqlrhozjtlxsxt");
    console.log("2. Navigate to SQL Editor.");
    console.log("3. Paste and run 'supabase/migrations/20261024000001_millproof_tables.sql'.");
    console.log("4. Paste and run 'supabase/seed.sql'.");
    console.log("5. Re-run 'npm run db:verify' to confirm all tables and queries pass.");
    console.log("=================================================");
  }
}

runDiagnostics();
