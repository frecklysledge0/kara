import { SellWorkspace } from "./SellWorkspace";

// The seller workspace depends on who is signed in, so it opts out of instant-navigation prerendering.
// See node_modules/next/dist/docs/01-app/02-guides/authentication-with-cache-components.md
export const instant = false;

export default function SellPage() {
  return <SellWorkspace />;
}
