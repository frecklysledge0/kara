"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, SlidersHorizontal } from "lucide-react";
import { useCustomerSearch } from "./CustomerState";
import { SellerCard } from "./SellerCard";
import { ContactPanel } from "./ContactPanel";
import { SupplierGlobe } from "./SupplierGlobe";
import { filterCustomerListings } from "@/lib/customer/catalog";
import type { AssistantResponse } from "@/types/assistant";
import type { CustomerListing } from "@/types/customer";

const examples = [
  { label: "A coastal structure", prompt: "I am building a welded coastal structure. I need 40 tons of corrosion-resistant plate. My total budget is $120,000." },
  { label: "Food processing equipment", prompt: "I need 15 tons of 0.25 inch plate for a sanitary food processing tank. My budget is $4,000 per ton." },
  { label: "Warehouse shelving", prompt: "I need 20 tons of economical steel sheet for indoor warehouse shelving, easy to form and weld. My total budget is $25,000." },
];

function QuerySelection() {
  const params = useSearchParams();
  const { ready, update } = useCustomerSearch();
  const applied = useRef<string | null>(null);
  useEffect(() => {
    const key = params.toString();
    if (!ready || applied.current === key) return;
    applied.current = key;
    const grade = params.get("grade");
    const prompt = params.get("prompt") || params.get("q");
    if (grade) update({ grade, selected: null, form: "" });
    if (prompt) update({ prompt });
  }, [params, ready, update]);
  return null;
}

export function CustomerSearch() {
  const { state, update, ready } = useCustomerSearch();
  const { prompt, response, inventory, grade, location, form, selected, questionIndex } = state;
  const [busy, setBusy] = useState(false);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [error, setError] = useState("");
  const [inventoryError, setInventoryError] = useState("");
  const [answer, setAnswer] = useState("");
  const [contact, setContact] = useState<CustomerListing | null>(null);
  const request = useRef<AbortController | null>(null);
  const promptBox = useRef<HTMLTextAreaElement>(null);
  const results = useRef<HTMLElement>(null);

  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    fetch("/api/customer-inventory", { signal: controller.signal, cache: "no-store" })
      .then(async (res) => { if (!res.ok) throw new Error(); return res.json(); })
      .then((body: { listings: CustomerListing[] }) => { update({ inventory: body.listings }); setInventoryError(""); })
      .catch(() => { if (!controller.signal.aborted) setInventoryError("Inventory is temporarily unavailable. Try your search again."); })
      .finally(() => { if (!controller.signal.aborted) setInventoryLoading(false); });
    return () => controller.abort();
  }, [ready, update]);

  async function search(text = prompt, answeredQuestions: string[] = []) {
    if (!text.trim() || busy) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError("");
    update({ prompt: text });
    const timeout = setTimeout(() => controller.abort(), 60000);
    try {
      const [res, catalog] = await Promise.all([
        fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: text }), signal: controller.signal }),
        fetch("/api/customer-inventory", { cache: "no-store", signal: controller.signal }).catch(() => null),
      ]);
      if (!res.ok) throw new Error();
      const data: AssistantResponse = await res.json();
      if (!data.success) throw new Error();
      if (catalog?.ok) { update({ inventory: (await catalog.json()).listings }); setInventoryError(""); }
      else setInventoryError("Supplier information could not be refreshed. Displayed inventory may have changed.");
      update({ response: data, grade: data.eligible_grades[0]?.grade_id || "", selected: null, form: "", questionIndex: 0, answeredQuestions });
      setAnswer("");
      requestAnimationFrame(() => results.current?.focus({ preventScroll: true }));
    } catch {
      setError(controller.signal.aborted ? "The search took too long. Please try again." : "We could not complete your search. Please try again; your brief is still here.");
    } finally { clearTimeout(timeout); setBusy(false); }
  }

  function submit(event: FormEvent) { event.preventDefault(); void search(); }
  function clarify(event: FormEvent) {
    event.preventDefault();
    if (answer.trim()) void search(`${prompt}\n\nClarification — ${questions[questionIndex]} ${answer}`, [...state.answeredQuestions, questions[questionIndex]]);
  }
  const questions = [...new Set([...(response?.clarification_questions ?? []), ...(response?.parsed_specification.missing_information ?? [])])].filter((question) => !state.answeredQuestions.includes(question));
  const eligible = response?.eligible_grades ?? [];
  const rankedIds = new Set(response?.ranked_listings.map((item) => item.listing_id));
  const assessed = Boolean(response && eligible.some((item) => item.grade_id === grade));
  const available = response && !grade ? [] : assessed ? inventory.filter((item) => rankedIds.has(item.id)) : inventory;
  const filtered = filterCustomerListings(available, grade, location, form);
  const allDemo = filtered.length > 0 && filtered.every((item) => item.is_demo);
  const showResults = Boolean(response || grade);
  const selectedId = filtered.some((item) => item.id === selected) ? selected : null;

  function select(id: string, fromGlobe = false) {
    update({ selected: id });
    if (fromGlobe) document.getElementById(`seller-${id}`)?.scrollIntoView({ behavior: "auto", block: "nearest" });
  }

  return <div className="customer-content">
    <Suspense><QuerySelection /></Suspense>
    <section className={`search-hero ${showResults ? "has-results" : ""}`} aria-labelledby="search-title">
      <p className="eyebrow hero-eyebrow">From possibility to material</p>
      <h1 id="search-title">Find the right steel.</h1>
      <p className="hero-copy">Describe your project. Discover the material and the people behind it.</p>
      <form className="prompt-form" onSubmit={submit}>
        <label htmlFor="project-requirements" className="sr-only">Describe your project and steel requirements</label>
        <textarea ref={promptBox} id="project-requirements" value={prompt} maxLength={6000} required
          onChange={(event) => update({ prompt: event.target.value })} placeholder="What are you building? Include the environment, quantity, and budget…" aria-describedby="prompt-help" />
        <div className="prompt-bottom"><p id="prompt-help">Budget in USD: total or per ton.</p>
          <button className="submit-button" type="submit" disabled={busy || !prompt.trim()} aria-label={busy ? "Finding steel" : "Find steel"}>
            <span>{busy ? "Finding…" : "Find steel"}</span><ArrowRight size={19} aria-hidden="true" />
          </button>
        </div>
      </form>
      <div className="example-prompts">{examples.map((example) => <button type="button" key={example.label} disabled={busy} onClick={() => { update({ prompt: example.prompt }); promptBox.current?.focus(); }}>{example.label}<span aria-hidden="true">↗</span></button>)}</div>
      <p className="search-status small muted" role="status">{busy ? "Reading your brief and checking available steel…" : ""}</p>
      {error && <p role="alert" className="customer-error">{error}{response && " Previous results remain below."}</p>}
    </section>

    {showResults && <section ref={results} className="search-results" tabIndex={-1} aria-label="Steel recommendations" aria-busy={busy}>
      {response && <>
        <div className="section-heading"><div><p className="eyebrow">01 / Material direction</p><h2>A starting point for your project.</h2></div><span className="small muted">{Math.min(eligible.length, 3)} suggested grades</span></div>
        <div className="grade-recommendations">{eligible.slice(0, 3).map((item, index) => <article key={item.grade_id} className={grade === item.grade_id ? "grade-option active" : "grade-option"}>
          <span className="eyebrow">0{index + 1} / {item.material_family}</span>
          <h3>{item.canonical_name}</h3>
          <p>{item.fit_reasons[0] || "Review this grade against your project requirements."}</p>
          <div className="grade-actions"><button type="button" className="text-button" aria-pressed={grade === item.grade_id} onClick={() => update({ grade: item.grade_id, selected: null, form: "" })}>{grade === item.grade_id ? "Selected" : "View sellers"}<ArrowRight size={14} /></button>
            <Link href={`/know-your-steel?grade=${item.grade_id}`}>Explore properties ↗</Link></div>
          <details className="grade-disclosure"><summary>Why this grade?</summary><div>
            <ul>{[...item.fit_reasons.slice(1), ...item.limitations, ...item.unresolved_engineering_requirements].map((text, i) => <li key={i}>{text}</li>)}</ul>
            {!!response.parsed_specification.inferred_assumptions.length && <><p>Assumptions to review</p><ul>{response.parsed_specification.inferred_assumptions.map((text) => <li key={text}>{text}</li>)}</ul></>}
          </div></details>
        </article>)}</div>
        {!eligible.length && <p className="empty-results">No suitable grade could be identified. Add more detail to your brief to continue.</p>}
        {questions[questionIndex] && <form className="clarification" onSubmit={clarify}>
          <div><p className="eyebrow">A detail to refine</p><label htmlFor="clarification-answer">{questions[questionIndex]}</label></div>
          <div className="clarification-input"><input id="clarification-answer" value={answer} onChange={(event) => setAnswer(event.target.value)} required maxLength={500} placeholder="Add a detail…" /><button className="text-button" disabled={busy || !answer.trim()}>Update <ArrowRight size={15} /></button></div>
          <button type="button" className="skip-question" onClick={() => { update({ questionIndex: questionIndex + 1 }); setAnswer(""); }}>Skip for now</button>
        </form>}
      </>}

      <section id="suppliers" className="supplier-section" aria-label="Matching suppliers">
        <div className="section-heading"><div><p className="eyebrow">02 / Make a connection</p><h2>Your material. Somewhere on Earth.</h2></div><span role="status" className="small muted">{inventoryLoading ? "Loading inventory…" : `${filtered.length} matching ${filtered.length === 1 ? "lot" : "lots"}`}</span></div>
        {!assessed && grade && <p className="small muted">Browsing inventory for this grade. Suitability for your project has not been assessed.</p>}
        <div className="supplier-controls">
          <label className="location-control">Supplier location<input aria-label="Supplier location" value={location} onChange={(event) => update({ location: event.target.value, selected: null })} placeholder="City or state code" /></label>
          <details className="additional-filters"><summary><SlidersHorizontal size={14} />Filters{form && " (1)"}</summary><div><label>Product form<select value={form} onChange={(event) => update({ form: event.target.value, selected: null })}><option value="">All forms</option>{[...new Set(inventory.filter((item) => !grade || item.grade_id === grade).map((item) => item.form))].map((value) => <option key={value}>{value}</option>)}</select></label><button className="text-button" type="button" onClick={() => update({ form: "" })}>Clear filter</button></div></details>
        </div>
        {allDemo && <p className="demo-notice">Demonstration inventory · All results shown here are synthetic.</p>}
        {inventoryError && <p role="alert" className="customer-error">{inventoryError}</p>}
        <div className="supplier-layout">
          <SupplierGlobe listings={filtered} selected={selectedId} onSelect={(id) => select(id, true)} />
          <div className="seller-list" id="seller-list" aria-label="Supplier inventory">
            {filtered.map((item) => <SellerCard key={item.id} listing={item} selected={selectedId === item.id} showDemo={!allDemo}
              candidate={response?.ranked_listings.find((candidate) => candidate.listing_id === item.id)} onSelect={() => select(item.id)} onContact={() => { select(item.id); setContact(item); }} />)}
            {!filtered.length && !inventoryLoading && <div className="empty-results"><h3>No inventory in this view.</h3><p>Try another location or form. Your material brief stays with you.</p>{(location || form) && <button className="text-button" type="button" onClick={() => update({ location: "", form: "", selected: null })}>Show all locations and forms <ArrowRight size={15} /></button>}</div>}
          </div>
        </div>
      </section>
      {response && <p className="reference-note">{response.notice} Budgets are targets, not hard price filters.</p>}
    </section>}
    {contact && <ContactPanel listing={contact} prompt={prompt} onClose={() => setContact(null)} />}
  </div>;
}
