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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      accounting_entries: {
        Row: {
          amount: number
          category: string
          created_at: string
          date: string
          description: string
          id: string
          reference: string | null
          type: string
          updated_at: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          date?: string
          description: string
          id?: string
          reference?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          date?: string
          description?: string
          id?: string
          reference?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      company_info: {
        Row: {
          address: string | null
          city: string | null
          company_name: string
          country: string | null
          created_at: string
          email: string | null
          id: string
          legal_name: string | null
          logo_url: string | null
          phone: string | null
          postal_code: string | null
          registration_number: string | null
          state: string | null
          tax_id: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_name: string
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          legal_name?: string | null
          logo_url?: string | null
          phone?: string | null
          postal_code?: string | null
          registration_number?: string | null
          state?: string | null
          tax_id?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_name?: string
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          legal_name?: string | null
          logo_url?: string | null
          phone?: string | null
          postal_code?: string | null
          registration_number?: string | null
          state?: string | null
          tax_id?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          contact_person: string | null
          country: string | null
          created_at: string
          declaration_numbers: string[] | null
          email: string | null
          id: string
          industry: string | null
          name: string
          phone: string | null
          updated_at: string
          webpage: string | null
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          country?: string | null
          created_at?: string
          declaration_numbers?: string[] | null
          email?: string | null
          id?: string
          industry?: string | null
          name: string
          phone?: string | null
          updated_at?: string
          webpage?: string | null
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          country?: string | null
          created_at?: string
          declaration_numbers?: string[] | null
          email?: string | null
          id?: string
          industry?: string | null
          name?: string
          phone?: string | null
          updated_at?: string
          webpage?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          content: string | null
          created_at: string
          id: string
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          name: string
          type: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory: {
        Row: {
          category: string
          created_at: string
          customer_id: string | null
          description: string | null
          drawings_files: Json | null
          id: string
          location: string | null
          materials_used: Json | null
          minimum_stock: number | null
          name: string
          part_number: string | null
          photo_url: string | null
          production_status: string | null
          quantity: number
          supplier: string | null
          tools_used: Json | null
          unit_price: number
          updated_at: string
          weight: number | null
        }
        Insert: {
          category: string
          created_at?: string
          customer_id?: string | null
          description?: string | null
          drawings_files?: Json | null
          id?: string
          location?: string | null
          materials_used?: Json | null
          minimum_stock?: number | null
          name: string
          part_number?: string | null
          photo_url?: string | null
          production_status?: string | null
          quantity?: number
          supplier?: string | null
          tools_used?: Json | null
          unit_price?: number
          updated_at?: string
          weight?: number | null
        }
        Update: {
          category?: string
          created_at?: string
          customer_id?: string | null
          description?: string | null
          drawings_files?: Json | null
          id?: string
          location?: string | null
          materials_used?: Json | null
          minimum_stock?: number | null
          name?: string
          part_number?: string | null
          photo_url?: string | null
          production_status?: string | null
          quantity?: number
          supplier?: string | null
          tools_used?: Json | null
          unit_price?: number
          updated_at?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          created_at: string
          description: string
          id: string
          invoice_id: string | null
          quantity: number
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          invoice_id?: string | null
          quantity?: number
          total?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string | null
          quantity?: number
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_invoice_items_invoice"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          created_at: string
          currency: string | null
          customer_id: string | null
          declaration_number: string | null
          due_date: string | null
          id: string
          incoterms: string | null
          invoice_number: string
          issue_date: string
          net_weight: number | null
          notes: string | null
          order_number: string | null
          packing: number | null
          shipping_address: string | null
          shipping_date: string | null
          status: string
          tara_weight: number | null
          total_quantity: number | null
          total_weight: number | null
          updated_at: string
          vat_rate: number | null
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string | null
          customer_id?: string | null
          declaration_number?: string | null
          due_date?: string | null
          id?: string
          incoterms?: string | null
          invoice_number: string
          issue_date?: string
          net_weight?: number | null
          notes?: string | null
          order_number?: string | null
          packing?: number | null
          shipping_address?: string | null
          shipping_date?: string | null
          status?: string
          tara_weight?: number | null
          total_quantity?: number | null
          total_weight?: number | null
          updated_at?: string
          vat_rate?: number | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string | null
          customer_id?: string | null
          declaration_number?: string | null
          due_date?: string | null
          id?: string
          incoterms?: string | null
          invoice_number?: string
          issue_date?: string
          net_weight?: number | null
          notes?: string | null
          order_number?: string | null
          packing?: number | null
          shipping_address?: string | null
          shipping_date?: string | null
          status?: string
          tara_weight?: number | null
          total_quantity?: number | null
          total_weight?: number | null
          updated_at?: string
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      labels: {
        Row: {
          content: Json | null
          created_at: string
          id: string
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          content?: Json | null
          created_at?: string
          id?: string
          name: string
          type: string
          updated_at?: string
        }
        Update: {
          content?: Json | null
          created_at?: string
          id?: string
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      materials_library: {
        Row: {
          created_at: string
          density: number | null
          description: string | null
          grade: string
          id: string
          material_number: string | null
          material_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          density?: number | null
          description?: string | null
          grade: string
          id?: string
          material_number?: string | null
          material_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          density?: number | null
          description?: string | null
          grade?: string
          id?: string
          material_number?: string | null
          material_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      staff: {
        Row: {
          can_see_customers: boolean | null
          can_see_prices: boolean | null
          created_at: string
          department: string | null
          email: string | null
          id: string
          is_active: boolean
          last_login: string | null
          name: string
          page_permissions: Json | null
          password_hash: string | null
          phone: string | null
          position: string | null
          updated_at: string
        }
        Insert: {
          can_see_customers?: boolean | null
          can_see_prices?: boolean | null
          created_at?: string
          department?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          last_login?: string | null
          name: string
          page_permissions?: Json | null
          password_hash?: string | null
          phone?: string | null
          position?: string | null
          updated_at?: string
        }
        Update: {
          can_see_customers?: boolean | null
          can_see_prices?: boolean | null
          created_at?: string
          department?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          last_login?: string | null
          name?: string
          page_permissions?: Json | null
          password_hash?: string | null
          phone?: string | null
          position?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      staff_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          session_token: string
          staff_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          session_token: string
          staff_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          session_token?: string
          staff_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_sessions_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_locations: {
        Row: {
          address: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          address: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          payment_terms: string | null
          phone: string | null
          tax_id: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          tax_id?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          tax_id?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      tools_library: {
        Row: {
          category: string
          created_at: string
          cutting_parameters: Json | null
          description: string | null
          id: string
          manufacturer: string | null
          part_number: string | null
          specifications: Json | null
          tool_name: string
          tool_type: string
          typical_applications: string[] | null
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          cutting_parameters?: Json | null
          description?: string | null
          id?: string
          manufacturer?: string | null
          part_number?: string | null
          specifications?: Json | null
          tool_name: string
          tool_type: string
          typical_applications?: string[] | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          cutting_parameters?: Json | null
          description?: string | null
          id?: string
          manufacturer?: string | null
          part_number?: string | null
          specifications?: Json | null
          tool_name?: string
          tool_type?: string
          typical_applications?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string
          dark_mode: boolean
          date_format: string
          email_notifications: boolean
          font_size: string
          id: string
          inventory_notifications: boolean
          language: string
          push_notifications: boolean
          security_notifications: boolean
          system_notifications: boolean
          theme_color: string
          timezone: string
          updated_at: string
          user_id: string
          work_order_notifications: boolean
        }
        Insert: {
          created_at?: string
          dark_mode?: boolean
          date_format?: string
          email_notifications?: boolean
          font_size?: string
          id?: string
          inventory_notifications?: boolean
          language?: string
          push_notifications?: boolean
          security_notifications?: boolean
          system_notifications?: boolean
          theme_color?: string
          timezone?: string
          updated_at?: string
          user_id: string
          work_order_notifications?: boolean
        }
        Update: {
          created_at?: string
          dark_mode?: boolean
          date_format?: string
          email_notifications?: boolean
          font_size?: string
          id?: string
          inventory_notifications?: boolean
          language?: string
          push_notifications?: boolean
          security_notifications?: boolean
          system_notifications?: boolean
          theme_color?: string
          timezone?: string
          updated_at?: string
          user_id?: string
          work_order_notifications?: boolean
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: string | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      work_orders: {
        Row: {
          actual_hours: number | null
          assigned_to: string | null
          created_at: string
          customer_id: string | null
          description: string | null
          due_date: string | null
          estimated_hours: number | null
          id: string
          inventory_id: string | null
          part_name: string | null
          part_number: string | null
          priority: string
          status: string
          title: string
          updated_at: string
          work_order_number: string | null
        }
        Insert: {
          actual_hours?: number | null
          assigned_to?: string | null
          created_at?: string
          customer_id?: string | null
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          inventory_id?: string | null
          part_name?: string | null
          part_number?: string | null
          priority?: string
          status?: string
          title: string
          updated_at?: string
          work_order_number?: string | null
        }
        Update: {
          actual_hours?: number | null
          assigned_to?: string | null
          created_at?: string
          customer_id?: string | null
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          inventory_id?: string | null
          part_name?: string | null
          part_number?: string | null
          priority?: string
          status?: string
          title?: string
          updated_at?: string
          work_order_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      authenticate_staff: {
        Args: { staff_email: string; staff_password: string }
        Returns: Json
      }
      generate_invoice_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_work_order_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      verify_staff_session: {
        Args: { token: string }
        Returns: Json
      }
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
