"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Plus, X } from "lucide-react";
import type { SteelGradeEntry, StrengthProperty } from "@/types/grades";
import { SteelSpecimen } from "./SteelSpecimen";

const featured = ["astm-a36", "astm-a572-50", "aisi-304", "aisi-316l"];
const properties = ["Composition", "Strength", "Corrosion", "Weldability"] as const;
type Property = typeof properties[number];
const strength = (property: StrengthProperty) => [
  property.min !== null ? `Min ${property.min} ${property.unit}` : null,
  property.max !== null ? `Max ${property.max} ${property.unit}` : null,
  property.typical !== null ? `Typical ${property.typical} ${property.unit}` : null,
].filter(Boolean).join(" · ") || "Not specified";

function PropertyContent({ grade, property }: { grade: SteelGradeEntry; property: Property }) {
  if (property === "Composition") return <>
    <p className="small muted">Reference chemistry limits · % by weight</p>
    <dl className="composition-list">{Object.entries(grade.chemistry_limits.elements).map(([element, limit]) => <div key={element}><dt>{element}</dt><dd>{limit.min !== null && limit.max !== null ? `${limit.min}–${limit.max}` : limit.max !== null ? `≤ ${limit.max}` : limit.min !== null ? `≥ ${limit.min}` : "Not specified"}{limit.note && <small>{limit.note}</small>}</dd></div>)}</dl>
    <p className="small muted">{grade.chemistry_limits.source}</p>
  </>;
  if (property === "Strength") return <>
    <h3>Yield strength</h3><p className="property-value">{strength(grade.mechanical_properties.yield_strength)}</p><p className="small muted">{grade.mechanical_properties.yield_strength.condition}</p>
    <h3>Tensile strength</h3><p className="property-value">{strength(grade.mechanical_properties.tensile_strength)}</p><p className="small muted">{grade.mechanical_properties.tensile_strength.condition}</p>
  </>;
  if (property === "Corrosion") return <><h3>{grade.corrosion_resistance.category}</h3><p>{grade.corrosion_resistance.details}</p>{grade.corrosion_resistance.pren !== null && <p className="small muted">Reference PREN: {grade.corrosion_resistance.pren}</p>}</>;
  return <><h3>{grade.weldability.rating}</h3><p>{grade.weldability.notes}</p><p className="small muted">Processes: {grade.weldability.recommended_processes.join(", ")}</p></>;
}

export function SteelExplorer({ grades }: { grades: SteelGradeEntry[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const requested = params.get("grade");
  const grade = grades.find((item) => item.id === requested) ?? grades.find((item) => item.id === "astm-a36")!;
  const [property, setProperty] = useState<Property | null>(null);
  const options = grades.filter((item) => featured.includes(item.id) || item.id === grade.id);

  return <div className="explorer-page">
    <header className="explorer-heading">
      <div><p className="eyebrow">Know Your Steel / Material library</p><h1 key={grade.id}>{grade.canonical_name}</h1><p className="muted">{grade.material_family}</p></div>
      <label className="grade-selector">Explore a grade<select value={grade.id} onChange={(event) => { setProperty(null); router.replace(`/know-your-steel?grade=${event.target.value}`, { scroll: false }); }}>{options.map((item) => <option key={item.id} value={item.id}>{item.canonical_name}</option>)}</select></label>
    </header>
    {requested && requested !== grade.id && <p role="status" className="small muted">That grade is not in the reference library. Showing {grade.canonical_name}.</p>}
    <div className={`explorer-layout ${property ? "panel-open" : ""}`}>
      <div className="specimen-area">
        <SteelSpecimen />
        <div className="property-hotspots" aria-label="Reference properties">{properties.map((name, index) => <button key={name} className={`property-hotspot hotspot-${index} ${property === name ? "active" : ""}`} type="button" aria-expanded={property === name} aria-controls="property-panel" onClick={() => setProperty(property === name ? null : name)}><Plus size={14} aria-hidden="true" /><span>{name}</span></button>)}</div>
        <p className="specimen-caption"><span className="eyebrow">01 / I-section study</span>Illustrative shape. Grade and product form are separate choices.</p>
      </div>
      {property && <section id="property-panel" className="property-panel" aria-labelledby="property-title" key={`${grade.id}-${property}`}>
        <div className="property-panel-heading"><p className="eyebrow">Reference properties</p><button type="button" className="icon-button" aria-label="Close property panel" onClick={() => setProperty(null)}><X size={18} /></button></div>
        <h2 id="property-title">{property}</h2>
        <PropertyContent grade={grade} property={property} />
        <h3>Typical uses</h3><p>{grade.typical_uses.join(" · ")}</p>
        <details className="grade-disclosure"><summary>Source & limitations</summary><ul>{grade.limitations_and_guidance.known_limitations.map((item) => <li key={item}>{item}</li>)}</ul><p className="small muted">{grade.source_references.map((item) => `${item.title} — ${item.publisher}`).join("; ")}</p></details>
        <p className="small muted">Reference values, not batch test results. {grade.disclaimer}</p>
      </section>}
    </div>
    <div className="explorer-bottom"><div><p className="eyebrow">From understanding to sourcing</p><p>{grade.description}</p></div><Link className="solid-button" href={`/?grade=${grade.id}#suppliers`}>Find sellers for this grade <ArrowRight size={17} /></Link></div>
    <p className="reference-note">Curated reference data · {grade.applicable_standard}. Your project brief is retained when you return to Find Steel.</p>
  </div>;
}
