export interface CustomerListing {
  id: string;
  grade_id: string | null;
  grade_name: string;
  form: string;
  quantity_tons: number;
  price_per_ton: number | null;
  seller_name: string;
  city: string;
  state: string;
  is_demo: boolean;
  coordinates: { lat: number; lng: number } | null;
  contact: { email: string | null; phone: string | null; website: string | null };
  details: {
    thickness_in: number | null;
    heat_number: string | null;
    certificate: boolean;
    mill_route: string | null;
    origin: string | null;
    chemistry: Record<string, number | null>;
  };
}
