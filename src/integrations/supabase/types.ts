export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      dispense: {
        Row: {
          color: string | null
          created_at: string
          id: string
          location: string | null
          name: string
          products_count: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          location?: string | null
          name: string
          products_count?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          location?: string | null
          name?: string
          products_count?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      dispense_products: {
        Row: {
          created_at: string
          dispensa_id: string
          id: string
          last_scanned_at: string | null
          product_id: string
          quantity: number
          threshold: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          dispensa_id: string
          id?: string
          last_scanned_at?: string | null
          product_id: string
          quantity?: number
          threshold?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          dispensa_id?: string
          id?: string
          last_scanned_at?: string | null
          product_id?: string
          quantity?: number
          threshold?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispense_products_dispensa_id_fkey"
            columns: ["dispensa_id"]
            isOneToOne: false
            referencedRelation: "dispense"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispense_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      product_categories: {
        Row: {
          category_name: string
          created_at: string
          id: string
          product_id: string
        }
        Insert: {
          category_name: string
          created_at?: string
          id?: string
          product_id: string
        }
        Update: {
          category_name?: string
          created_at?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          allergens: string | null
          barcode: string | null
          brand: string | null
          carbon_footprint: Json | null
          category: string | null
          created_at: string
          ecoscore: string | null
          id: string
          image_url: string | null
          ingredients: string | null
          labels: string | null
          name: string | null
          nova_group: number | null
          nutriscore: string | null
          nutritional_values: Json | null
          origin: string | null
          packaging: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          allergens?: string | null
          barcode?: string | null
          brand?: string | null
          carbon_footprint?: Json | null
          category?: string | null
          created_at?: string
          ecoscore?: string | null
          id?: string
          image_url?: string | null
          ingredients?: string | null
          labels?: string | null
          name?: string | null
          nova_group?: number | null
          nutriscore?: string | null
          nutritional_values?: Json | null
          origin?: string | null
          packaging?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          allergens?: string | null
          barcode?: string | null
          brand?: string | null
          carbon_footprint?: Json | null
          category?: string | null
          created_at?: string
          ecoscore?: string | null
          id?: string
          image_url?: string | null
          ingredients?: string | null
          labels?: string | null
          name?: string | null
          nova_group?: number | null
          nutriscore?: string | null
          nutritional_values?: Json | null
          origin?: string | null
          packaging?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          tutorial_completed: boolean | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          tutorial_completed?: boolean | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          tutorial_completed?: boolean | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      scan_logs: {
        Row: {
          action: string
          barcode: string | null
          created_at: string
          dispensa_id: string
          id: string
          product_id: string | null
          quantity: number
          scanner_id: string
        }
        Insert: {
          action: string
          barcode?: string | null
          created_at?: string
          dispensa_id: string
          id?: string
          product_id?: string | null
          quantity?: number
          scanner_id: string
        }
        Update: {
          action?: string
          barcode?: string | null
          created_at?: string
          dispensa_id?: string
          id?: string
          product_id?: string | null
          quantity?: number
          scanner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scan_logs_dispensa_id_fkey"
            columns: ["dispensa_id"]
            isOneToOne: false
            referencedRelation: "dispense"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_logs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_logs_scanner_id_fkey"
            columns: ["scanner_id"]
            isOneToOne: false
            referencedRelation: "scanners"
            referencedColumns: ["id"]
          },
        ]
      }
      scanners: {
        Row: {
          created_at: string
          dispensa_id: string | null
          id: string
          last_seen_at: string | null
          name: string
          serial_number: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dispensa_id?: string | null
          id?: string
          last_seen_at?: string | null
          name: string
          serial_number: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dispensa_id?: string | null
          id?: string
          last_seen_at?: string | null
          name?: string
          serial_number?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scanners_dispensa_id_fkey"
            columns: ["dispensa_id"]
            isOneToOne: false
            referencedRelation: "dispense"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
