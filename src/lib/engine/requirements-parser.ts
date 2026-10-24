import { GoogleGenAI } from "@google/genai";
import { BuyerSpecification, BuyerSpecificationSchema } from "@/types/assistant";

// =====================================================================
// MillProof: AI Requirements Parser (Step 1)
// Translates natural language into structured, validated specifications.
// Strictly separates explicit buyer criteria from inferred assumptions.
// =====================================================================

export async function parseBuyerRequirements(
  prompt: string
): Promise<BuyerSpecification> {
  const cleanPrompt = prompt.trim();
  if (!cleanPrompt) {
    throw new Error("Cannot parse empty requirements prompt.");
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const parsed = await parseWithGemini(cleanPrompt, apiKey);
      if (parsed) {
        return parsed;
      }
    } catch (err) {
      console.warn("Gemini requirements parsing encountered error, activating deterministic fallback:", err);
    }
  }

  // Deterministic rule-based fallback when Gemini is unavailable or rate-limited
  return parseRequirementsDeterministic(cleanPrompt);
}

/**
 * Parses requirements using Google GenAI with strict JSON schema instructions.
 */
async function parseWithGemini(prompt: string, apiKey: string): Promise<BuyerSpecification | null> {
  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `
You are a metallurgical procurement specification parser for an industrial B2B steel marketplace.
Convert the user's natural language request into a strictly structured JSON object.

RULES:
1. Missing information MUST remain null. Never fabricate thickness, standard, budget, or city if not stated.
2. Put parameters explicitly requested by the buyer in "explicit_requirements".
3. Put reasonable engineering inferences in "inferred_assumptions" (e.g., "Assumed marine atmospheric C4/C5 exposure due to coastal mention").
4. Put missing technical specs in "missing_information" (e.g., "Thickness in inches not specified", "Delivery destination city/state not provided").
5. Map product form to standard terms: "Plate", "Wide Flange Beam", "Round Bar", "Sheet", "Channel", or null.
6. Extract numeric values cleanly:
   - quantity_tons: positive number or null
   - thickness_in: positive number (in inches) or null
   - budget_per_ton: positive number ($/ton) or null

JSON SCHEMA:
{
  "use_case": "concise description of the intended application",
  "environment": "environmental conditions (e.g., Outdoor coastal atmospheric, Food contact sanitary, Indoor dry, Sub-zero structural)",
  "required_properties": ["list", "of", "required", "properties", "e.g.", "corrosion resistance", "high yield strength", "weldable"],
  "prohibited_materials_or_constraints": ["list of forbidden or constrained items, e.g. no carbon steel, no painting"],
  "quantity_tons": number or null,
  "form": "Plate" | "Wide Flange Beam" | "Round Bar" | "Sheet" | null,
  "thickness_in": number or null,
  "buyer_city": string or null,
  "state_or_country": string or null,
  "budget_per_ton": number or null,
  "applicable_standard": string or null,
  "explicit_requirements": ["list of explicit requirements directly requested by user"],
  "inferred_assumptions": ["list of assumptions inferred by AI"],
  "missing_information": ["list of missing data needed for production"]
}
`;

  const candidateModels = ["gemini-3.5-flash", "gemini-3.8-flash", "gemini-flash-latest"];

  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            role: "user",
            parts: [{ text: `Customer Request: "${prompt}"` }],
          },
        ],
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      });

      if (response.text) {
        const rawJson = JSON.parse(response.text);
        const validated = BuyerSpecificationSchema.safeParse(rawJson);
        if (validated.success) {
          return validated.data;
        } else {
          console.warn(`Model ${model} JSON did not match schema:`, validated.error.format());
        }
      }
    } catch (err) {
      console.warn(`Model ${model} failed in requirements parser:`, err);
    }
  }

  return null;
}

/**
 * Deterministic regex and heuristic parser used when API keys are absent or API times out.
 */
export function parseRequirementsDeterministic(prompt: string): BuyerSpecification {
  const lower = prompt.toLowerCase();
  const explicit: string[] = [];
  const inferred: string[] = [];
  const missing: string[] = [];

  // 1. Quantity extraction
  let quantity_tons: number | null = null;
  const qtyMatch = prompt.match(/(\d+(?:\.\d+)?)\s*(?:tons?|tonnes?|t\b)/i);
  if (qtyMatch) {
    quantity_tons = parseFloat(qtyMatch[1]);
    explicit.push(`Quantity: ${quantity_tons} tons`);
  } else {
    missing.push("Required tonnage quantity not specified");
  }

  // 2. Product Form
  let form: string | null = null;
  if (lower.includes("plate") || lower.includes("plates")) {
    form = "Plate";
    explicit.push("Product Form: Plate");
  } else if (lower.includes("wide flange") || lower.includes("beam") || lower.includes("girder") || lower.includes("i-beam")) {
    form = "Wide Flange Beam";
    explicit.push("Product Form: Wide Flange Beam");
  } else if (lower.includes("round bar") || lower.includes("shaft") || lower.includes("rod") || lower.includes("bar")) {
    form = "Round Bar";
    explicit.push("Product Form: Round Bar");
  } else if (lower.includes("sheet") || lower.includes("coil") || lower.includes("strip")) {
    form = "Sheet";
    explicit.push("Product Form: Sheet");
  } else {
    missing.push("Product form (Plate, Beam, Bar, Sheet) not specified");
  }

  // 3. Thickness
  let thickness_in: number | null = null;
  const thickMatchIn = prompt.match(/(\d+(?:\.\d+)?)\s*(?:in|inch|inches|")/i);
  const thickMatchMm = prompt.match(/(\d+(?:\.\d+)?)\s*mm/i);
  const fractionMatch = prompt.match(/(\d+)\/(\d+)\s*(?:in|inch|inches|")/i);

  if (fractionMatch) {
    thickness_in = parseInt(fractionMatch[1], 10) / parseInt(fractionMatch[2], 10);
    explicit.push(`Thickness: ${thickness_in}"`);
  } else if (thickMatchIn && !prompt.match(/(\d+(?:\.\d+)?)\s*tons/i)?.[0].includes(thickMatchIn[0])) {
    thickness_in = parseFloat(thickMatchIn[1]);
    explicit.push(`Thickness: ${thickness_in}"`);
  } else if (thickMatchMm) {
    thickness_in = Math.round((parseFloat(thickMatchMm[1]) / 25.4) * 1000) / 1000;
    explicit.push(`Thickness: ${thickness_in}" (converted from ${thickMatchMm[1]}mm)`);
  } else {
    missing.push("Specific material thickness or gage not specified");
  }

  // 4. Budget
  let budget_per_ton: number | null = null;
  const budgetMatch = prompt.match(/\$\s*(\d+(?:,\d+)?(?:\.\d+)?)\s*(?:\/ton|per ton|a ton)?/i);
  if (budgetMatch) {
    budget_per_ton = parseFloat(budgetMatch[1].replace(/,/g, ""));
    explicit.push(`Budget target: $${budget_per_ton}/ton`);
  }

  // 5. Geography / City
  let buyer_city: string | null = null;
  let state_or_country: string | null = null;
  const cities = [
    { city: "Chicago", state: "IL" },
    { city: "Detroit", state: "MI" },
    { city: "Houston", state: "TX" },
    { city: "Pittsburgh", state: "PA" },
    { city: "Cleveland", state: "OH" },
    { city: "Gary", state: "IN" },
    { city: "Philadelphia", state: "PA" },
    { city: "Dallas", state: "TX" },
  ];

  for (const c of cities) {
    if (lower.includes(c.city.toLowerCase())) {
      buyer_city = c.city;
      state_or_country = c.state;
      explicit.push(`Delivery location: ${c.city}, ${c.state}`);
      break;
    }
  }

  if (!buyer_city) {
    missing.push("Delivery destination city/state not provided (freight estimation will default to Chicago, IL)");
  }

  // 6. Environment & Properties
  let environment = "Standard atmospheric / indoor industrial";
  const required_properties: string[] = [];
  const prohibited_materials_or_constraints: string[] = [];

  if (lower.includes("coast") || lower.includes("marine") || lower.includes("salt") || lower.includes("offshore") || lower.includes("ocean")) {
    environment = "Outdoor coastal marine (Chloride atmospheric splash zone)";
    required_properties.push("Chloride pitting & crevice corrosion resistance");
    explicit.push("Corrosion resistance required for coastal exposure");
    inferred.push("Inferred requirement for austenitic stainless steel, duplex, or atmospheric weathering steel");
  } else if (lower.includes("food") || lower.includes("dairy") || lower.includes("sanitary") || lower.includes("beverage")) {
    environment = "Food processing / sanitary contact";
    required_properties.push("Food-contact hygienic passivity", "Non-toxic alloy composition");
    prohibited_materials_or_constraints.push("No unalloyed carbon steel", "No toxic trace elements");
    explicit.push("Food-contact sanitary compliance");
    inferred.push("Inferred requirement for AISI 304 or 316L austenitic stainless steel");
  } else if (lower.includes("shaft") || lower.includes("axle") || lower.includes("pin") || lower.includes("gear") || lower.includes("torque")) {
    environment = "Mechanical machinery shafting / dynamic torque";
    required_properties.push("High torsional yield strength", "Surface hardenability", "Machinability");
    explicit.push("Machine shaft mechanical service");
    inferred.push("Inferred need for heat-treatable medium-carbon or low-alloy engineering steel");
  } else if (lower.includes("shelv") || lower.includes("rack") || lower.includes("low budget") || lower.includes("cheap") || lower.includes("economical")) {
    environment = "Indoor warehouse / commercial dry";
    required_properties.push("Cost-effective baseline structural strength", "Formability");
    explicit.push("Economical / low-budget priority");
    prohibited_materials_or_constraints.push("Avoid high-cost stainless or exotic alloys");
    inferred.push("Inferred preference for standard commercial carbon steel (ASTM A36 or SAE 1018)");
  } else if (lower.includes("structure") || lower.includes("building") || lower.includes("bridge") || lower.includes("column")) {
    environment = "Structural civil infrastructure";
    required_properties.push("Specified structural yield strength", "Weldability under AWS D1.1");
    explicit.push("Structural building / frame application");
  }

  if (lower.includes("weld") || lower.includes("welding")) {
    required_properties.push("Prequalified weldability (low carbon equivalent)");
    explicit.push("Weldability specified");
  }

  if (lower.includes("high strength") || lower.includes("50 ksi") || lower.includes("toughness")) {
    required_properties.push("High tensile strength (>= 50 ksi yield)");
    explicit.push("High strength requirement");
  }

  // 7. Use case summary
  let use_case = prompt;
  if (prompt.length > 120) {
    use_case = prompt.substring(0, 117) + "...";
  }

  return {
    use_case,
    environment,
    required_properties: Array.from(new Set(required_properties)),
    prohibited_materials_or_constraints: Array.from(new Set(prohibited_materials_or_constraints)),
    quantity_tons,
    form,
    thickness_in,
    buyer_city,
    state_or_country,
    budget_per_ton,
    applicable_standard: null,
    explicit_requirements: explicit,
    inferred_assumptions: inferred,
    missing_information: missing,
  };
}
