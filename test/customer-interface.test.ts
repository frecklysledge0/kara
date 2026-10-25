import { describe, expect, it } from "vitest";
import { filterCustomerListings, formatPrice, publicContacts, validCoordinates } from "@/lib/customer/catalog";
import { projectPoint, shortestLongitude } from "@/lib/customer/globe";
import type { CustomerListing } from "@/types/customer";

const lot = (id: string, city: string, state: string, grade = "astm-a36", form = "Plate"): CustomerListing => ({
  id, city, state, grade_id: grade, form, grade_name: "ASTM A36", seller_name: "Test supplier",
  price_per_ton: 900, quantity_tons: 20, is_demo: true, coordinates: null,
  contact: { email: null, phone: null, website: null },
  details: { thickness_in: null, heat_number: null, certificate: false, mill_route: null, origin: null, chemistry: {} },
});

describe("Customer inventory view shared by globe and list", () => {
  const inventory = [lot("gary", "Gary", "IN"), lot("houston", "Houston", "TX"), lot("stainless", "Houston", "TX", "aisi-316l"), lot("bar", "Gary", "IN", "astm-a36", "Round Bar")];
  it("applies grade, location and form to one common result set", () => {
    expect(filterCustomerListings(inventory, "astm-a36", "gary, in", "Plate").map((item) => item.id)).toEqual(["gary"]);
  });
  it("matches locations without case sensitivity or comma sensitivity", () => {
    expect(filterCustomerListings(inventory, "", "HOUSTON, TX", "").map((item) => item.id)).toEqual(["houston", "stainless"]);
  });
  it("returns a genuine zero result instead of substituting demo inventory", () => {
    expect(filterCustomerListings(inventory, "astm-a36", "Nowhere", "")).toEqual([]);
  });
  it("does not mutate inventory while refining location", () => {
    filterCustomerListings(inventory, "astm-a36", "Gary", "");
    expect(inventory).toHaveLength(4);
    expect(filterCustomerListings(inventory, "aisi-316l", "", "")).toHaveLength(1);
  });
  it.each([null, NaN, 0, -1])("keeps missing or invalid prices honest: %s", (price) => {
    expect(formatPrice(price)).toBe("Price not published");
  });
  it("labels a published price once with its unit", () => expect(formatPrice(950)).toBe("$950 / ton"));
});

describe("Public business contacts", () => {
  it("does not offer synthetic contacts as real channels", () => {
    expect(publicContacts({ contact_email: "sales@steel.test", contact_phone: "+1 555 123 4567", website: "https://steel.test" }, true)).toEqual({ email: null, phone: null, website: null });
  });
  it("uses published fields, never account email", () => {
    expect(publicContacts({ email: "private@steel.test" }, false).email).toBeNull();
    expect(publicContacts({ contact_email: "sales@steel.test", contact_phone: "+1 555 123 4567", website: "https://steel.test" }, false)).toEqual({ email: "sales@steel.test", phone: "+1 555 123 4567", website: "https://steel.test/" });
  });
  it("rejects internal demo email and unsafe URL schemes", () => {
    expect(publicContacts({ contact_email: "sales@demo.internal", website: "javascript:alert(1)", contact_phone: "not provided" }, false)).toEqual({ email: null, phone: null, website: null });
  });
  it("rejects credential-bearing URLs", () => expect(publicContacts({ website: "https://name:password@steel.test" }, false).website).toBeNull());
});

describe("Globe positioning and focus", () => {
  it("retains legitimate zero coordinates", () => expect(validCoordinates(0, 0)).toEqual({ lat: 0, lng: 0 }));
  it.each([[null, -87], [91, 10], [20, 181], [NaN, 30]])("does not invent coordinates for invalid input", (lat, lng) => expect(validCoordinates(lat, lng)).toBeNull());
  it("projects the selected location to the center of the visible hemisphere", () => {
    const point = projectPoint(41.5934, -87.3464, 41.5934, -87.3464);
    expect(point.x).toBeCloseTo(0); expect(point.y).toBeCloseTo(0); expect(point.z).toBeCloseTo(1);
  });
  it("hides markers on the rear hemisphere", () => expect(projectPoint(0, 180, 0, 0).z).toBeLessThan(0));
  it("turns across the dateline by the short route", () => {
    expect(shortestLongitude(170, -170)).toBe(20);
    expect(shortestLongitude(-170, 170)).toBe(-20);
  });
});
