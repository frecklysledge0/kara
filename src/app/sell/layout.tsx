import { RequireSeller } from "@/components/auth/RequireSeller";

// Seller pages depend on who is signed in, so they can't be prerendered as an instant static shell.
// Documented opt-out: node_modules/next/dist/docs/01-app/02-guides/authentication-with-cache-components.md
export const instant = false;

/** The listing / certificate-upload workspace is for signed-in sellers only. */
export default function SellLayout({ children }: { children: React.ReactNode }) {
  return <RequireSeller>{children}</RequireSeller>;
}
