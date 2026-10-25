import { NextRequest, NextResponse } from "next/server";
import { translateGrade, getPopularGradeTranslations } from "@/lib/engine/grade-translator";

/**
 * GET /api/grades/translate?q=S355JR
 * Returns sourced cross-standard steel grade translations and equivalence metadata.
 */
export async function GET(req: NextRequest) {
  // Keep the Cache Components request-time read outside application error handling.
  const searchParams = req.nextUrl.searchParams;
  try {
    const query = searchParams.get("q") || "";

    if (!query.trim()) {
      return NextResponse.json({
        success: true,
        query: "",
        matches: [],
        suggestions: getPopularGradeTranslations(),
        notice: "Provide a foreign or international designation (e.g. 'S355JR', '1.4404', 'SS400', '42CrMo4').",
      });
    }

    const matches = translateGrade(query);

    return NextResponse.json({
      success: true,
      query,
      count: matches.length,
      matches,
      suggestions: getPopularGradeTranslations(),
      disclaimer: "Informational equivalence guidance only. Final structural substitution requires Engineer of Record (EOR) review.",
    });
  } catch (err: unknown) {
    console.error("GET /api/grades/translate error:", err);
    const msg = err instanceof Error ? err.message : "Error translating grade";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
