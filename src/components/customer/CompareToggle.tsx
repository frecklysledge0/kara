"use client";

import { useCustomerSearch } from "./CustomerState";

export function CompareToggle({ id }: { id: string }) {
  const { state, update } = useCustomerSearch();
  const checked = state.compareIds.includes(id);
  const full = state.compareIds.length >= 3 && !checked;
  return <button className="compare-toggle" type="button" aria-pressed={checked} disabled={full}
    title={full ? "Remove a lot from comparison to add another (maximum 3)." : undefined}
    onClick={() => update({ compareIds: checked ? state.compareIds.filter((item) => item !== id) : [...state.compareIds, id] })}>
    {checked ? "✓ Added to comparison" : full ? "Comparison full (3)" : "+ Compare lot"}
  </button>;
}
