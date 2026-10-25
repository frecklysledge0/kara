import type { Metadata } from "next";
import { CustomerSearch } from "@/components/customer/CustomerSearch";

export const metadata: Metadata = {
  title: "Find Your Steel | MillProof",
  description: "Describe your project, explore suitable steel grades, and find matching supplier inventory.",
};

export default function HomePage() {
  return <CustomerSearch />;
}
