"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { AssistantResponse } from "@/types/assistant";
import type { CustomerListing } from "@/types/customer";

export interface SearchState {
  prompt: string;
  response: AssistantResponse | null;
  inventory: CustomerListing[];
  grade: string;
  location: string;
  form: string;
  selected: string | null;
  questionIndex: number;
  answeredQuestions: string[];
  compareIds: string[];
}
const initial: SearchState = { prompt: "", response: null, inventory: [], grade: "", location: "", form: "", selected: null, questionIndex: 0, answeredQuestions: [], compareIds: [] };
const Context = createContext<{
  state: SearchState;
  update: (value: Partial<SearchState>) => void;
  ready: boolean;
} | null>(null);

export function CustomerState({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SearchState>(initial);
  const update = useCallback((value: Partial<SearchState>) => setState((previous) => ({ ...previous, ...value })), []);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(sessionStorage.getItem("millproof_compare_lots") || "[]");
      // Browser storage is an external source and cannot be read during server rendering.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (Array.isArray(saved)) update({ compareIds: [...new Set(saved.filter((id): id is string => typeof id === "string"))].slice(0, 3) });
    } catch { /* Storage may be unavailable. In-memory selection still works. */ }
    setReady(true);
  }, [update]);
  useEffect(() => {
    if (!ready) return;
    try { sessionStorage.setItem("millproof_compare_lots", JSON.stringify(state.compareIds)); } catch { /* Private browsing. */ }
  }, [state.compareIds, ready]);
  // Root-layout state survives navigation between search and the material explorer.
  return <Context.Provider value={{ state, update, ready }}>{children}</Context.Provider>;
}

export function useCustomerSearch() {
  const context = useContext(Context);
  if (!context) throw new Error("CustomerState is required");
  return context;
}
