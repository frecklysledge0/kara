"use client";

import React from "react";
import { 
  AlertTriangle, 
  CheckCircle2, 
  Flame, 
  Scale, 
  Layers, 
  BookOpen, 
  Info,
  Compass,
  Globe
} from "lucide-react";
import { SteelGradeEntry } from "@/types/grades";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";

interface GradeDetailPanelProps {
  grade: SteelGradeEntry;
  className?: string;
  showDisclaimerBanner?: boolean;
}

export function GradeDetailPanel({
  grade,
  className = "",
  showDisclaimerBanner = true
}: GradeDetailPanelProps) {
  const chemElements = Object.entries(grade.chemistry_limits.elements);

  const costTierLabels: Record<number, string> = {
    1: "Tier 1: Economy Structural Carbon",
    2: "Tier 2: High-Strength Low-Alloy / Engineering",
    3: "Tier 3: Low-Alloy / Ferritic Stainless",
    4: "Tier 4: Austenitic Stainless (Cr-Ni-Mo)",
    5: "Tier 5: Premium Duplex / High-Alloy"
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Informational Guidance Notice */}
      {showDisclaimerBanner && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-900 text-xs flex items-start gap-2.5">
          <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold block text-[11px] uppercase tracking-wider text-amber-800">
              Technical Reference Notice
            </span>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              {grade.disclaimer}
            </p>
          </div>
        </div>
      )}

      {/* Grade Header & Family Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-xl font-bold font-mono tracking-tight text-slate-900">
                  {grade.canonical_name}
                </CardTitle>
                <Badge variant="outline" size="sm">
                  {grade.material_family}
                </Badge>
                {grade.review_metadata.status === "fully_checked" ? (
                  <Badge variant="success" size="sm">
                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                    <span>Source Verified ({grade.review_metadata.last_reviewed})</span>
                  </Badge>
                ) : (
                  <Badge variant="warning" size="sm">
                    <span>Review Pending</span>
                  </Badge>
                )}
              </div>
              <CardDescription className="mt-1">
                Standard: <span className="font-mono text-slate-800 font-medium">{grade.applicable_standard}</span>
                {grade.uns_number && (
                  <> &bull; UNS: <span className="font-mono text-slate-800">{grade.uns_number}</span></>
                )}
                {grade.en_designation && (
                  <> &bull; EN: <span className="font-mono text-slate-800">{grade.en_designation}</span></>
                )}
              </CardDescription>
            </div>

            {/* Relative Cost Indicator */}
            <div className="text-right sm:border-l sm:border-slate-200 sm:pl-4">
              <span className="text-[10px] uppercase font-mono text-slate-500 block">Relative Cost Factor</span>
              <div className="text-base font-bold font-mono text-slate-900">
                {grade.relative_cost_tier.cost_factor_vs_a36.toFixed(1)}x{" "}
                <span className="text-[10px] font-normal text-slate-500">vs A36</span>
              </div>
              <span className="text-[10px] text-slate-500 block">
                {costTierLabels[grade.relative_cost_tier.tier]}
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-0">
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed border-t border-slate-100 pt-3">
            {grade.description}
          </p>

          {/* Typical Uses */}
          <div>
            <span className="text-[11px] font-semibold text-slate-900 uppercase tracking-wider block mb-1.5">
              Typical Applications
            </span>
            <div className="flex flex-wrap gap-1.5">
              {grade.typical_uses.map((use, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[11px] border border-slate-200"
                >
                  {use}
                </span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mechanical Property Ranges */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-slate-700" />
            <CardTitle className="text-sm">Mechanical Property Specification Ranges</CardTitle>
          </div>
          <CardDescription>
            Design allowable and standard verification thresholds. Values vary with heat treatment and thickness.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Property</TableHead>
                <TableHead>Minimum</TableHead>
                <TableHead>Maximum</TableHead>
                <TableHead>Typical</TableHead>
                <TableHead>Applicable Condition / Notes</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {/* Yield Strength */}
              <TableRow>
                <TableCell className="font-medium text-slate-900">
                  Yield Strength ({grade.mechanical_properties.yield_strength.unit})
                </TableCell>
                <TableCell className="font-mono font-semibold text-slate-900">
                  {grade.mechanical_properties.yield_strength.min !== null
                    ? `${grade.mechanical_properties.yield_strength.min} min`
                    : "Not specified"}
                </TableCell>
                <TableCell className="font-mono text-slate-600">
                  {grade.mechanical_properties.yield_strength.max !== null
                    ? `${grade.mechanical_properties.yield_strength.max} max`
                    : "—"}
                </TableCell>
                <TableCell className="font-mono text-slate-700">
                  {grade.mechanical_properties.yield_strength.typical !== null
                    ? `${grade.mechanical_properties.yield_strength.typical}`
                    : "—"}
                </TableCell>
                <TableCell className="text-[11px] text-slate-600">
                  {grade.mechanical_properties.yield_strength.condition}
                </TableCell>
              </TableRow>

              {/* Tensile Strength */}
              <TableRow>
                <TableCell className="font-medium text-slate-900">
                  Tensile Strength ({grade.mechanical_properties.tensile_strength.unit})
                </TableCell>
                <TableCell className="font-mono font-semibold text-slate-900">
                  {grade.mechanical_properties.tensile_strength.min !== null
                    ? `${grade.mechanical_properties.tensile_strength.min} min`
                    : "Not specified"}
                </TableCell>
                <TableCell className="font-mono text-slate-600">
                  {grade.mechanical_properties.tensile_strength.max !== null
                    ? `${grade.mechanical_properties.tensile_strength.max} max`
                    : "—"}
                </TableCell>
                <TableCell className="font-mono text-slate-700">
                  {grade.mechanical_properties.tensile_strength.typical !== null
                    ? `${grade.mechanical_properties.tensile_strength.typical}`
                    : "—"}
                </TableCell>
                <TableCell className="text-[11px] text-slate-600">
                  {grade.mechanical_properties.tensile_strength.condition}
                </TableCell>
              </TableRow>

              {/* Elongation */}
              <TableRow>
                <TableCell className="font-medium text-slate-900">
                  Elongation (%)
                </TableCell>
                <TableCell className="font-mono font-semibold text-slate-900">
                  {grade.mechanical_properties.elongation_pct.min !== null
                    ? `${grade.mechanical_properties.elongation_pct.min}% min`
                    : "—"}
                </TableCell>
                <TableCell className="font-mono text-slate-600">—</TableCell>
                <TableCell className="font-mono text-slate-700">—</TableCell>
                <TableCell className="text-[11px] text-slate-600">
                  Gauge: {grade.mechanical_properties.elongation_pct.gauge_length}
                </TableCell>
              </TableRow>

              {/* Hardness */}
              <TableRow>
                <TableCell className="font-medium text-slate-900">
                  Hardness ({grade.mechanical_properties.hardness.scale || "N/A"})
                </TableCell>
                <TableCell className="font-mono text-slate-600">—</TableCell>
                <TableCell className="font-mono text-slate-600">
                  {grade.mechanical_properties.hardness.max !== null
                    ? `${grade.mechanical_properties.hardness.max} max`
                    : "—"}
                </TableCell>
                <TableCell className="font-mono text-slate-700">
                  {grade.mechanical_properties.hardness.typical !== null
                    ? `${grade.mechanical_properties.hardness.typical}`
                    : "—"}
                </TableCell>
                <TableCell className="text-[11px] text-slate-600">
                  Standard surface hardness cap
                </TableCell>
              </TableRow>

              {/* Charpy Impact */}
              {grade.mechanical_properties.charpy_impact && (
                <TableRow>
                  <TableCell className="font-medium text-slate-900">Charpy V-Notch (CVN)</TableCell>
                  <TableCell className="font-mono text-slate-900" colSpan={3}>
                    {grade.mechanical_properties.charpy_impact.min_avg_ft_lbs !== null
                      ? `${grade.mechanical_properties.charpy_impact.min_avg_ft_lbs} ft-lbs @ ${grade.mechanical_properties.charpy_impact.test_temp_f}°F`
                      : "Optional requirement"}
                  </TableCell>
                  <TableCell className="text-[11px] text-slate-600">
                    {grade.mechanical_properties.charpy_impact.note || "Governing standard impact criteria."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Chemical Composition Limits */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-700" />
              <CardTitle className="text-sm">Ladle Chemical Composition Limits</CardTitle>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              Source: {grade.chemistry_limits.source}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Element</TableHead>
                <TableHead>Min %</TableHead>
                <TableHead>Max %</TableHead>
                <TableHead>Applicability / Conditioning Notes</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {chemElements.map(([element, limits]) => (
                <TableRow key={element}>
                  <TableCell className="font-mono font-bold text-slate-900">
                    {element}
                  </TableCell>
                  <TableCell className="font-mono text-slate-800">
                    {limits.min !== null ? `${limits.min.toFixed(3)}%` : "—"}
                  </TableCell>
                  <TableCell className="font-mono font-semibold text-slate-900">
                    {limits.max !== null ? `${limits.max.toFixed(3)}%` : "—"}
                  </TableCell>
                  <TableCell className="text-[11px] text-slate-600">
                    {limits.note || "Standard composition bound"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Environmental & Corrosion Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-slate-700" />
              <CardTitle className="text-sm">Environmental Suitability</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-xs pt-1">
            <div className="border-b border-slate-100 pb-2">
              <span className="font-semibold text-slate-900 block">Indoor Dry Service:</span>
              <p className="text-slate-600 mt-0.5">{grade.environmental_suitability.indoor_dry}</p>
            </div>
            <div className="border-b border-slate-100 pb-2">
              <span className="font-semibold text-slate-900 block">Outdoor Atmospheric Exposure:</span>
              <p className="text-slate-600 mt-0.5">{grade.environmental_suitability.outdoor_atmospheric}</p>
            </div>
            <div className="border-b border-slate-100 pb-2">
              <span className="font-semibold text-slate-900 block">Marine / Saltwater Exposure:</span>
              <p className="text-slate-600 mt-0.5">{grade.environmental_suitability.marine_offshore}</p>
            </div>
            <div className="border-b border-slate-100 pb-2">
              <span className="font-semibold text-slate-900 block">Sub-Zero / Cryogenic Service:</span>
              <p className="text-slate-600 mt-0.5">{grade.environmental_suitability.sub_zero}</p>
            </div>
            <div>
              <span className="font-semibold text-slate-900 block">Elevated Temperature Limit:</span>
              <p className="text-slate-600 mt-0.5">{grade.environmental_suitability.high_temperature}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-slate-700" />
              <CardTitle className="text-sm">Corrosion Resistance &amp; Weldability</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-xs pt-1">
            {/* Corrosion Box */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900">Corrosion Rating</span>
                {grade.corrosion_resistance.pren && (
                  <Badge variant="secondary" size="sm">
                    PREN: {grade.corrosion_resistance.pren}
                  </Badge>
                )}
              </div>
              <p className="font-medium text-slate-800 text-[11px]">
                {grade.corrosion_resistance.category}
              </p>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                {grade.corrosion_resistance.details}
              </p>
            </div>

            {/* Weldability Box */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900">Weldability</span>
                <span className="text-[10px] font-mono text-slate-500">
                  {grade.weldability.recommended_processes.join(", ")}
                </span>
              </div>
              <p className="font-medium text-slate-800 text-[11px]">
                {grade.weldability.rating}
              </p>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                {grade.weldability.notes}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Limitations, Avoid-For, and Equivalents */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <CardTitle className="text-sm">Limitations &amp; Avoidance Guidance</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-xs pt-1">
            <div>
              <span className="font-semibold text-slate-900 block mb-1">Known Engineering Limitations:</span>
              <ul className="list-disc list-inside space-y-1 text-slate-600">
                {grade.limitations_and_guidance.known_limitations.map((lim, idx) => (
                  <li key={idx} className="leading-relaxed">{lim}</li>
                ))}
              </ul>
            </div>
            <div className="pt-2 border-t border-slate-100">
              <span className="font-semibold text-rose-800 block mb-1">Avoid Specification For:</span>
              <ul className="list-disc list-inside space-y-1 text-slate-600">
                {grade.limitations_and_guidance.avoid_for.map((av, idx) => (
                  <li key={idx} className="leading-relaxed">{av}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-slate-700" />
              <CardTitle className="text-sm">Cross-Standard Equivalents</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2.5 text-xs pt-1">
            {grade.cross_standard_equivalents.map((eq, idx) => (
              <div key={idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-slate-900">{eq.designation}</span>
                  <Badge
                    variant={eq.confidence === "Direct Equivalent" ? "success" : "secondary"}
                    size="sm"
                  >
                    {eq.confidence}
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {eq.source_notes}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Bibliographic References */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-slate-700" />
            <CardTitle className="text-sm">Bibliographic Citations &amp; Technical References</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-xs pt-1">
          {grade.source_references.map((ref, idx) => (
            <div key={idx} className="flex items-start justify-between p-2 rounded bg-slate-50 border border-slate-200">
              <div>
                <span className="font-medium text-slate-900 block">{ref.title}</span>
                <span className="text-[11px] text-slate-500 font-mono">{ref.publisher} &bull; {ref.url_or_identifier}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
