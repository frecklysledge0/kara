// =====================================================================
// MillProof: Generated / Maintained Supabase Database Type Definitions
// Corresponds to schema: sellers, listings, certificates, orders
// =====================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type QuoteStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "quoted"
  | "accepted"
  | "declined"
  | "closed";

export interface Database {
  public: {
    Tables: {
      sellers: {
        Row: {
          id: string;
          name: string;
          city: string;
          state: string;
          country: string;
          latitude: number | null;
          longitude: number | null;
          mill_route: "EAF" | "BOF" | null;
          description: string | null;
          demo_status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          city: string;
          state: string;
          country?: string;
          latitude?: number | null;
          longitude?: number | null;
          mill_route?: "EAF" | "BOF" | null;
          description?: string | null;
          demo_status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          city?: string;
          state?: string;
          country?: string;
          latitude?: number | null;
          longitude?: number | null;
          mill_route?: "EAF" | "BOF" | null;
          description?: string | null;
          demo_status?: string;
          created_at?: string;
        };
        Relationships: [];
      };

      certificates: {
        Row: {
          id: string;
          seller_id: string | null;
          file_path: string;
          original_filename: string;
          document_sha256: string;
          heat_number: string;
          mill_name: string;
          grade: string;
          melt_pour_country: string | null;
          chemistry: Json;
          mechanical: Json;
          extraction_status: "pending" | "processing" | "completed" | "failed";
          review_status: "unreviewed" | "flagged" | "approved" | "rejected";
          risk_score: number | null;
          flags: Json;
          extraction_metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          seller_id?: string | null;
          file_path: string;
          original_filename: string;
          document_sha256: string;
          heat_number: string;
          mill_name: string;
          grade: string;
          melt_pour_country?: string | null;
          chemistry?: Json;
          mechanical?: Json;
          extraction_status?: "pending" | "processing" | "completed" | "failed";
          review_status?: "unreviewed" | "flagged" | "approved" | "rejected";
          risk_score?: number | null;
          flags?: Json;
          extraction_metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          seller_id?: string | null;
          file_path?: string;
          original_filename?: string;
          document_sha256?: string;
          heat_number?: string;
          mill_name?: string;
          grade?: string;
          melt_pour_country?: string | null;
          chemistry?: Json;
          mechanical?: Json;
          extraction_status?: "pending" | "processing" | "completed" | "failed";
          review_status?: "unreviewed" | "flagged" | "approved" | "rejected";
          risk_score?: number | null;
          flags?: Json;
          extraction_metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "certificates_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "sellers";
            referencedColumns: ["id"];
          }
        ];
      };

      listings: {
        Row: {
          id: string;
          seller_id: string;
          grade: string;
          form: string;
          thickness_in: number;
          quantity_tons: number;
          price_per_ton: number;
          certificate_id: string | null;
          status: "draft" | "active" | "reserved" | "closed";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          seller_id: string;
          grade: string;
          form: string;
          thickness_in: number;
          quantity_tons: number;
          price_per_ton: number;
          certificate_id?: string | null;
          status?: "draft" | "active" | "reserved" | "closed";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          seller_id?: string;
          grade?: string;
          form?: string;
          thickness_in?: number;
          quantity_tons?: number;
          price_per_ton?: number;
          certificate_id?: string | null;
          status?: "draft" | "active" | "reserved" | "closed";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "listings_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "sellers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "listings_certificate_id_fkey";
            columns: ["certificate_id"];
            isOneToOne: false;
            referencedRelation: "certificates";
            referencedColumns: ["id"];
          }
        ];
      };

      orders: {
        Row: {
          id: string;
          listing_id: string;
          buyer_id?: string;
          seller_id?: string | null;
          buyer_name: string;
          buyer_email?: string;
          buyer_company?: string | null;
          buyer_city: string;
          buyer_state?: string;
          buyer_zip?: string | null;
          quantity_tons: number;
          estimated_delivered_cost: number;
          original_price_per_ton?: number;
          original_estimated_delivered_cost?: number;
          quoted_price_per_ton?: number | null;
          final_quoted_cost?: number | null;
          is_estimate?: boolean;
          quoted_at?: string | null;
          seller_notes?: string | null;
          buyer_notes?: string | null;
          decline_reason?: string | null;
          status: QuoteStatus;
          created_at: string;
          updated_at?: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          buyer_id?: string;
          seller_id?: string | null;
          buyer_name: string;
          buyer_email?: string;
          buyer_company?: string | null;
          buyer_city: string;
          buyer_state?: string;
          buyer_zip?: string | null;
          quantity_tons: number;
          estimated_delivered_cost: number;
          original_price_per_ton?: number;
          original_estimated_delivered_cost?: number;
          quoted_price_per_ton?: number | null;
          final_quoted_cost?: number | null;
          is_estimate?: boolean;
          quoted_at?: string | null;
          seller_notes?: string | null;
          buyer_notes?: string | null;
          decline_reason?: string | null;
          status?: QuoteStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          listing_id?: string;
          buyer_id?: string;
          seller_id?: string | null;
          buyer_name?: string;
          buyer_email?: string;
          buyer_company?: string | null;
          buyer_city?: string;
          buyer_state?: string;
          buyer_zip?: string | null;
          quantity_tons?: number;
          estimated_delivered_cost?: number;
          original_price_per_ton?: number;
          original_estimated_delivered_cost?: number;
          quoted_price_per_ton?: number | null;
          final_quoted_cost?: number | null;
          is_estimate?: boolean;
          quoted_at?: string | null;
          seller_notes?: string | null;
          buyer_notes?: string | null;
          decline_reason?: string | null;
          status?: QuoteStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "orders_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      inventory_listings: {
        Row: {
          id: string;
          seller_id: string;
          certificate_id: string | null;
          grade_id: string;
          title: string;
          product_form: string;
          dimensions_display: string;
          thickness_in: number;
          width_in: number;
          length_in: number;
          pieces_available: number;
          total_weight_lbs: number;
          price_per_cwt: number;
          warehouse_city: string;
          warehouse_state: string;
          warehouse_lat: number;
          warehouse_lng: number;
          min_order_quantity_lbs: number;
          status: string;
          is_synthetic_demo: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          seller_id?: string;
          certificate_id?: string | null;
          grade_id?: string;
          title?: string;
          product_form?: string;
          dimensions_display?: string;
          thickness_in?: number;
          width_in?: number;
          length_in?: number;
          pieces_available?: number;
          total_weight_lbs?: number;
          price_per_cwt?: number;
          warehouse_city?: string;
          warehouse_state?: string;
          warehouse_lat?: number;
          warehouse_lng?: number;
          min_order_quantity_lbs?: number;
          status?: string;
          is_synthetic_demo?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Views"]["inventory_listings"]["Insert"]>;
        Relationships: [];
      };
      material_test_certificates: {
        Row: {
          id: string;
          heat_number: string;
          cert_number: string;
          mill_name: string;
          mill_country: string;
          specification: string;
          en10204_type: string;
          product_form: string;
          dimensions: Json;
          chemical_analysis: Json;
          mechanical_results: Json;
          heat_treatment: string;
          storage_path: string | null;
          extracted_by_model: string;
          qc_status: string;
          qc_summary: Json;
          is_synthetic_demo: boolean;
          created_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

// ---------------------------------------------------------------------
// Domain Convenience Aliases
// ---------------------------------------------------------------------
export type SellerRow = Database["public"]["Tables"]["sellers"]["Row"];
export type SellerInsert = Database["public"]["Tables"]["sellers"]["Insert"];
export type SellerUpdate = Database["public"]["Tables"]["sellers"]["Update"];

export type CertificateRow = Database["public"]["Tables"]["certificates"]["Row"];
export type CertificateInsert = Database["public"]["Tables"]["certificates"]["Insert"];
export type CertificateUpdate = Database["public"]["Tables"]["certificates"]["Update"];

export type ListingRow = Database["public"]["Tables"]["listings"]["Row"];
export type ListingInsert = Database["public"]["Tables"]["listings"]["Insert"];
export type ListingUpdate = Database["public"]["Tables"]["listings"]["Update"];

export type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
export type OrderInsert = Database["public"]["Tables"]["orders"]["Insert"];
export type OrderUpdate = Database["public"]["Tables"]["orders"]["Update"];

// Enriched composite views
export interface ListingWithRelations extends ListingRow {
  seller?: SellerRow;
  certificate?: CertificateRow | null;
}

export interface OrderWithListing extends OrderRow {
  listing?: ListingWithRelations;
}

// ---------------------------------------------------------------------
// Validation Helpers (Enforcing positive numbers & strict types)
// ---------------------------------------------------------------------
export function validateListingInput(data: Partial<ListingInsert>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.seller_id) errors.push("seller_id is required");
  if (!data.grade || data.grade.trim() === "") errors.push("grade specification is required");
  if (!data.form || data.form.trim() === "") errors.push("product form is required");

  if (typeof data.thickness_in !== "number" || data.thickness_in <= 0 || isNaN(data.thickness_in)) {
    errors.push("thickness_in must be a positive numeric value");
  }

  if (typeof data.quantity_tons !== "number" || data.quantity_tons <= 0 || isNaN(data.quantity_tons)) {
    errors.push("quantity_tons must be a positive numeric value");
  }

  if (typeof data.price_per_ton !== "number" || data.price_per_ton <= 0 || isNaN(data.price_per_ton)) {
    errors.push("price_per_ton must be a positive numeric value");
  }

  if (data.status && !["draft", "active", "reserved", "closed"].includes(data.status)) {
    errors.push(`Invalid status '${data.status}'. Allowed: draft, active, reserved, closed`);
  }

  return { valid: errors.length === 0, errors };
}

export function validateOrderInput(data: Partial<OrderInsert>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.listing_id) errors.push("listing_id is required");
  if (!data.buyer_name || data.buyer_name.trim() === "") errors.push("buyer_name is required");
  if (!data.buyer_city || data.buyer_city.trim() === "") errors.push("buyer_city is required");

  if (typeof data.quantity_tons !== "number" || data.quantity_tons <= 0 || isNaN(data.quantity_tons)) {
    errors.push("quantity_tons must be a positive numeric value");
  }

  if (typeof data.estimated_delivered_cost !== "number" || data.estimated_delivered_cost <= 0 || isNaN(data.estimated_delivered_cost)) {
    errors.push("estimated_delivered_cost must be a positive numeric value");
  }

  if (data.status && !["draft", "submitted", "under_review", "quoted", "accepted", "declined", "closed"].includes(data.status)) {
    errors.push(`Invalid status '${data.status}'. Allowed: draft, submitted, under_review, quoted, accepted, declined, closed`);
  }

  return { valid: errors.length === 0, errors };
}
