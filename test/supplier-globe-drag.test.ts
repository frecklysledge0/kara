import { beforeEach, describe, expect, it, vi } from "vitest";
import { Children, isValidElement, type PointerEvent, type ReactNode, type SVGProps } from "react";
import { SupplierGlobe } from "@/components/customer/SupplierGlobe";

type View = { lat: number; lng: number };
const pending = vi.hoisted(() => ({ updates: [] as Array<View | ((view: View) => View)> }));

// Delay React's state queue until after pointer release to reproduce the crash.
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useState: (value: View) => [value, (update: View | ((view: View) => View)) => pending.updates.push(update)],
  useRef: (current: unknown) => ({ current }),
  useEffect: () => {},
  useMemo: (factory: () => unknown) => factory(),
  useId: () => "test-globe",
}));
vi.mock("@/components/customer/useSceneMotion", () => ({
  useSceneMotion: () => ({ ref: { current: null }, active: false, reduced: true }),
}));

function findGlobe(node: ReactNode): SVGProps<SVGSVGElement> | undefined {
  for (const child of Children.toArray(node)) {
    if (!isValidElement<{ children?: ReactNode }>(child)) continue;
    if (child.type === "svg") return child.props as SVGProps<SVGSVGElement>;
    const found = findGlobe(child.props.children);
    if (found) return found;
  }
}

function pointer(clientX: number, pointerId = 1) {
  return { clientX, pointerId, button: 0, currentTarget: { setPointerCapture: vi.fn() } } as unknown as PointerEvent<SVGSVGElement>;
}

function flush() {
  return pending.updates.reduce<View>((view, update) => typeof update === "function" ? update(view) : update, { lat: 25, lng: -85 });
}

describe("Supplier globe drag lifecycle", () => {
  beforeEach(() => { pending.updates = []; });

  it.each(["onPointerUp", "onPointerCancel", "onLostPointerCapture"] as const)(
    "safely applies queued movement after %s clears the drag",
    (end) => {
      const globe = findGlobe(SupplierGlobe({ listings: [], selected: null, onSelect: vi.fn() }))!;
      globe.onPointerDown!(pointer(100));
      globe.onPointerMove!(pointer(150));
      globe[end]?.(pointer(150));
      expect(flush()).toEqual({ lat: 25, lng: -105 });
      const queued = pending.updates.length;
      globe.onPointerMove!(pointer(200));
      expect(pending.updates).toHaveLength(queued);
    },
  );

  it("keeps queued moves tied to their original drag when a new drag starts", () => {
    const globe = findGlobe(SupplierGlobe({ listings: [], selected: null, onSelect: vi.fn() }))!;
    globe.onPointerDown!(pointer(100));
    globe.onPointerMove!(pointer(50));
    globe.onPointerUp!(pointer(50));
    globe.onPointerDown!(pointer(300));
    expect(flush()).toEqual({ lat: 25, lng: -65 });
  });

  it("ignores movement and release from a different pointer", () => {
    const globe = findGlobe(SupplierGlobe({ listings: [], selected: null, onSelect: vi.fn() }))!;
    globe.onPointerDown!(pointer(100));
    globe.onPointerMove!(pointer(200, 2));
    globe.onPointerUp!(pointer(200, 2));
    expect(pending.updates).toHaveLength(0);
    globe.onPointerMove!(pointer(125));
    expect(flush()).toEqual({ lat: 25, lng: -95 });
  });
});
