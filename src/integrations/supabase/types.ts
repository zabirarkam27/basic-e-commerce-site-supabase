export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      admin_secrets: {
        Row: {
          id: string;
          key: string;
          updated_at: string;
          value: string;
        };
        Insert: {
          id?: string;
          key: string;
          updated_at?: string;
          value?: string;
        };
        Update: {
          id?: string;
          key?: string;
          updated_at?: string;
          value?: string;
        };
        Relationships: [];
      };
      brands: {
        Row: {
          created_at: string;
          id: string;
          logo_url: string;
          name: string;
          slug: string;
          sort_order: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          logo_url?: string;
          name: string;
          slug: string;
          sort_order?: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          logo_url?: string;
          name?: string;
          slug?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          created_at: string;
          id: string;
          image_url: string;
          name: string;
          slug: string;
          sort_order: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          image_url?: string;
          name: string;
          slug: string;
          sort_order?: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          image_url?: string;
          name?: string;
          slug?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      faqs: {
        Row: {
          active: boolean;
          answer: string;
          created_at: string;
          id: string;
          question: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          answer: string;
          created_at?: string;
          id?: string;
          question: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          answer?: string;
          created_at?: string;
          id?: string;
          question?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      landing_pages: {
        Row: {
          active: boolean;
          created_at: string;
          cta_link: string;
          cta_text: string;
          ga_measurement_id: string;
          google_ads_id: string;
          headline: string;
          hero_image: string;
          id: string;
          meta_pixel_id: string;
          product_id: string | null;
          slug: string;
          subheadline: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          cta_link?: string;
          cta_text?: string;
          ga_measurement_id?: string;
          google_ads_id?: string;
          headline?: string;
          hero_image?: string;
          id?: string;
          meta_pixel_id?: string;
          product_id?: string | null;
          slug: string;
          subheadline?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          cta_link?: string;
          cta_text?: string;
          ga_measurement_id?: string;
          google_ads_id?: string;
          headline?: string;
          hero_image?: string;
          id?: string;
          meta_pixel_id?: string;
          product_id?: string | null;
          slug?: string;
          subheadline?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "landing_pages_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      checkout_leads: {
        Row: {
          address: string | null;
          area: string | null;
          cart_items: Json;
          created_at: string;
          customer_name: string | null;
          delivery_charge: number;
          id: string;
          landing_page_slug: string | null;
          last_seen_at: string;
          mobile: string | null;
          session_id: string;
          status: string;
          subtotal: number;
          total: number;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          area?: string | null;
          cart_items?: Json;
          created_at?: string;
          customer_name?: string | null;
          delivery_charge?: number;
          id?: string;
          landing_page_slug?: string | null;
          last_seen_at?: string;
          mobile?: string | null;
          session_id: string;
          status?: string;
          subtotal?: number;
          total?: number;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          area?: string | null;
          cart_items?: Json;
          created_at?: string;
          customer_name?: string | null;
          delivery_charge?: number;
          id?: string;
          landing_page_slug?: string | null;
          last_seen_at?: string;
          mobile?: string | null;
          session_id?: string;
          status?: string;
          subtotal?: number;
          total?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          address: string;
          area: string;
          courier_consignment_id: string | null;
          courier_note: string | null;
          courier_provider: string | null;
          courier_pushed_at: string | null;
          courier_status: string | null;
          courier_tracking_code: string | null;
          created_at: string;
          customer_name: string;
          delivery_charge: number;
          id: string;
          landing_page_slug: string | null;
          mobile: string;
          product_id: string | null;
          product_image: string | null;
          product_title: string;
          quantity: number;
          status: Database["public"]["Enums"]["order_status"];
          total: number;
          unit_price: number;
          variant_label: string | null;
        };
        Insert: {
          address: string;
          area: string;
          courier_consignment_id?: string | null;
          courier_note?: string | null;
          courier_provider?: string | null;
          courier_pushed_at?: string | null;
          courier_status?: string | null;
          courier_tracking_code?: string | null;
          created_at?: string;
          customer_name: string;
          delivery_charge: number;
          id?: string;
          landing_page_slug?: string | null;
          mobile: string;
          product_id?: string | null;
          product_image?: string | null;
          product_title: string;
          quantity?: number;
          status?: Database["public"]["Enums"]["order_status"];
          total: number;
          unit_price: number;
          variant_label?: string | null;
        };
        Update: {
          address?: string;
          area?: string;
          courier_consignment_id?: string | null;
          courier_note?: string | null;
          courier_provider?: string | null;
          courier_pushed_at?: string | null;
          courier_status?: string | null;
          courier_tracking_code?: string | null;
          created_at?: string;
          customer_name?: string;
          delivery_charge?: number;
          id?: string;
          landing_page_slug?: string | null;
          mobile?: string;
          product_id?: string | null;
          product_image?: string | null;
          product_title?: string;
          quantity?: number;
          status?: Database["public"]["Enums"]["order_status"];
          total?: number;
          unit_price?: number;
          variant_label?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "orders_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_variants: {
        Row: {
          color_hex: string | null;
          color_name: string | null;
          created_at: string;
          id: string;
          image_url: string | null;
          price_override: number | null;
          product_id: string;
          size_label: string | null;
          sort_order: number;
        };
        Insert: {
          color_hex?: string | null;
          color_name?: string | null;
          created_at?: string;
          id?: string;
          image_url?: string | null;
          price_override?: number | null;
          product_id: string;
          size_label?: string | null;
          sort_order?: number;
        };
        Update: {
          color_hex?: string | null;
          color_name?: string | null;
          created_at?: string;
          id?: string;
          image_url?: string | null;
          price_override?: number | null;
          product_id?: string;
          size_label?: string | null;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          active: boolean;
          brand_id: string | null;
          category_id: string | null;
          created_at: string;
          description: string | null;
          featured: boolean;
          gallery: Json;
          id: string;
          image_url: string;
          rating: number;
          regular_price: number;
          sale_price: number;
          sort_order: number;
          title: string;
        };
        Insert: {
          active?: boolean;
          brand_id?: string | null;
          category_id?: string | null;
          created_at?: string;
          description?: string | null;
          featured?: boolean;
          gallery?: Json;
          id?: string;
          image_url: string;
          rating?: number;
          regular_price: number;
          sale_price: number;
          sort_order?: number;
          title: string;
        };
        Update: {
          active?: boolean;
          brand_id?: string | null;
          category_id?: string | null;
          created_at?: string;
          description?: string | null;
          featured?: boolean;
          gallery?: Json;
          id?: string;
          image_url?: string;
          rating?: number;
          regular_price?: number;
          sale_price?: number;
          sort_order?: number;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey";
            columns: ["brand_id"];
            isOneToOne: false;
            referencedRelation: "brands";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      reviews: {
        Row: {
          active: boolean;
          avatar_url: string;
          created_at: string;
          id: string;
          location: string;
          name: string;
          rating: number;
          sort_order: number;
          text: string;
        };
        Insert: {
          active?: boolean;
          avatar_url?: string;
          created_at?: string;
          id?: string;
          location?: string;
          name: string;
          rating?: number;
          sort_order?: number;
          text: string;
        };
        Update: {
          active?: boolean;
          avatar_url?: string;
          created_at?: string;
          id?: string;
          location?: string;
          name?: string;
          rating?: number;
          sort_order?: number;
          text?: string;
        };
        Relationships: [];
      };
      settings: {
        Row: {
          key: string;
          updated_at: string;
          value: Json;
        };
        Insert: {
          key: string;
          updated_at?: string;
          value: Json;
        };
        Update: {
          key?: string;
          updated_at?: string;
          value?: Json;
        };
        Relationships: [];
      };
      site_sessions: {
        Row: {
          checkout_started_at: string | null;
          created_at: string;
          current_path: string | null;
          customer_name: string | null;
          first_seen_at: string;
          id: string;
          landing_page_slug: string | null;
          last_seen_at: string;
          mobile: string | null;
          order_duration_seconds: number | null;
          order_placed_at: string | null;
          referrer: string | null;
          session_id: string;
          updated_at: string;
          user_agent: string | null;
        };
        Insert: {
          checkout_started_at?: string | null;
          created_at?: string;
          current_path?: string | null;
          customer_name?: string | null;
          first_seen_at?: string;
          id?: string;
          landing_page_slug?: string | null;
          last_seen_at?: string;
          mobile?: string | null;
          order_duration_seconds?: number | null;
          order_placed_at?: string | null;
          referrer?: string | null;
          session_id: string;
          updated_at?: string;
          user_agent?: string | null;
        };
        Update: {
          checkout_started_at?: string | null;
          created_at?: string;
          current_path?: string | null;
          customer_name?: string | null;
          first_seen_at?: string;
          id?: string;
          landing_page_slug?: string | null;
          last_seen_at?: string;
          mobile?: string | null;
          order_duration_seconds?: number | null;
          order_placed_at?: string | null;
          referrer?: string | null;
          session_id?: string;
          updated_at?: string;
          user_agent?: string | null;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      videos: {
        Row: {
          active: boolean;
          created_at: string;
          id: string;
          sort_order: number;
          thumbnail_url: string;
          title: string;
          video_url: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          id?: string;
          sort_order?: number;
          thumbnail_url?: string;
          title?: string;
          video_url: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          id?: string;
          sort_order?: number;
          thumbnail_url?: string;
          title?: string;
          video_url?: string;
        };
        Relationships: [];
      };
      why_us_items: {
        Row: {
          active: boolean;
          created_at: string;
          description: string;
          icon: string;
          id: string;
          sort_order: number;
          title: string;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          description?: string;
          icon?: string;
          id?: string;
          sort_order?: number;
          title: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          description?: string;
          icon?: string;
          id?: string;
          sort_order?: number;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][];
          _user_id: string;
        };
        Returns: boolean;
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "admin" | "super_admin" | "sales" | "viewer";
      order_status: "Pending" | "Confirmed" | "Shipped" | "Cancelled";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "super_admin", "sales", "viewer"],
      order_status: ["Pending", "Confirmed", "Shipped", "Cancelled"],
    },
  },
} as const;
