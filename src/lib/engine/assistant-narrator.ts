import { AssistantResponse } from "@/types/assistant";

/**
 * Builds an objective, verbatim spoken procurement briefing from
 * existing server-generated recommendations.
 * 
 * CRITICAL SAFETY RULES:
 * - Reads existing recommendation data verbatim.
 * - Does NOT alter material eligibility, suitability scores, or lot rankings.
 * - Absolutely NO autonomous purchasing or external side effects.
 */
export function buildNarrationBriefing(data: AssistantResponse): string {
  const parts: string[] = [];

  const appDesc = data.parsed_specification?.use_case || "your specified industrial application";
  parts.push(`Procurement intelligence briefing for ${appDesc}.`);

  // 1. Eligible Grades Summary
  const eligible = data.eligible_grades || [];
  if (eligible.length > 0) {
    const gradeNames = eligible.map((g) => g.canonical_name).join(", ");
    parts.push(`Metallurgical evaluation identified ${eligible.length} eligible standard steel grade${eligible.length > 1 ? "s" : ""}: ${gradeNames}.`);
  } else {
    parts.push("No curated steel grades fully satisfied all operating constraints without exceeding standard metallurgical limits.");
  }

  // 2. Summary Guidance from Server
  if (data.summary_guidance && data.summary_guidance.trim().length > 0) {
    parts.push(data.summary_guidance.trim());
  }

  // 3. Top Ranked Inventory Lot
  const ranked = data.ranked_listings || [];
  if (ranked.length > 0) {
    const top = ranked[0];
    const scorePct = Math.round(top.total_score || 0);
    const gradeLabel = top.grade_name || top.grade_id || "certified prime";
    const sellerInfo = top.seller_name ? `from ${top.seller_name} in ${top.seller_state}` : "in active inventory";
    const weightInfo = `${top.quantity_tons} tons of ${top.form || "material"}`;
    parts.push(
      `The top-ranked physical inventory lot is ${gradeLabel} ${weightInfo} ${sellerInfo}, with a composite suitability score of ${scorePct} percent across material fit, MTR completeness, and delivered landed cost.`
    );

    if (top.explanation?.key_trade_offs && top.explanation.key_trade_offs.length > 0) {
      parts.push(`Key procurement note: ${top.explanation.key_trade_offs[0]}`);
    }
  } else {
    parts.push("No active physical inventory lots are currently listed matching these specific constraints.");
  }

  // 4. Ineligible Notice (if applicable)
  const ineligible = data.ineligible_grades || [];
  if (ineligible.length > 0) {
    const excludedCount = ineligible.length;
    parts.push(`${excludedCount} candidate grade${excludedCount > 1 ? "s were" : " was"} excluded due to hard mechanical or atmospheric incompatibility.`);
  }

  // 5. Standard Informational Guidance Disclaimer
  parts.push("This briefing is for informational procurement guidance only and does not constitute certified engineering approval.");

  return parts.join(" ");
}
