"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
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
}
const initial: SearchState = { prompt: "", response: null, inventory: [], grade: "", location: "", form: "", selected: null, questionIndex: 0, answeredQuestions: [] };
const Context = createContext<{
  state: SearchState;
  update: (value: Partial<SearchState>) => void;
  ready: boolean;
} | null>(null);

export function CustomerState({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SearchState>(initial);
  const update = useCallback((value: Partial<SearchState>) => setState((previous) => ({ ...previous, ...value })), []);
  // Root-layout state survives navigation between search and the material explorer.
  return <Context.Provider value={{ state, update, ready: true }}>{children}</Context.Provider>;
}

export function useCustomerSearch() {
  const context = useContext(Context);
  if (!context) throw new Error("CustomerState is required");
  return context;
}
