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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      account_views: {
        Row: {
          account_id: string
          section: string
          seen_at: string
        }
        Insert: {
          account_id: string
          section: string
          seen_at?: string
        }
        Update: {
          account_id?: string
          section?: string
          seen_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_views_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          auth_user_id: string | null
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          role: string
          synthetic_email: string
          unit_id: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          full_name: string
          id?: string
          is_active?: boolean
          phone?: string | null
          role: string
          synthetic_email: string
          unit_id: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          role?: string
          synthetic_email?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      aidat_kayit: {
        Row: {
          devir_aidat: number | null
          gecikme_tazminati: number
          id: string
          isinma_dogalgaz: number
          onceki_ay_tahsilati: number | null
          onceki_aydan_devir: number
          period_id: string
          sabit_aidat: number
          sicak_su: number
          toplam: number
          unit_id: string
        }
        Insert: {
          devir_aidat?: number | null
          gecikme_tazminati?: number
          id?: string
          isinma_dogalgaz?: number
          onceki_ay_tahsilati?: number | null
          onceki_aydan_devir?: number
          period_id: string
          sabit_aidat?: number
          sicak_su?: number
          toplam?: number
          unit_id: string
        }
        Update: {
          devir_aidat?: number | null
          gecikme_tazminati?: number
          id?: string
          isinma_dogalgaz?: number
          onceki_ay_tahsilati?: number | null
          onceki_aydan_devir?: number
          period_id?: string
          sabit_aidat?: number
          sicak_su?: number
          toplam?: number
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "aidat_kayit_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aidat_kayit_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          attachment_path: string | null
          body: string
          created_at: string
          id: string
          title: string
        }
        Insert: {
          attachment_path?: string | null
          body: string
          created_at?: string
          id?: string
          title: string
        }
        Update: {
          attachment_path?: string | null
          body?: string
          created_at?: string
          id?: string
          title?: string
        }
        Relationships: []
      }
      blocks: {
        Row: {
          code: string
          id: string
          name: string
        }
        Insert: {
          code: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      demirbas_kayit: {
        Row: {
          devir_demirbas: number | null
          gecikme_tazminati: number
          id: string
          onceki_ay_tahsilati: number | null
          onceki_aydan_devir: number
          period_id: string
          toplam: number
          unit_id: string
          yeni_kalemler: Json | null
        }
        Insert: {
          devir_demirbas?: number | null
          gecikme_tazminati?: number
          id?: string
          onceki_ay_tahsilati?: number | null
          onceki_aydan_devir?: number
          period_id: string
          toplam?: number
          unit_id: string
          yeni_kalemler?: Json | null
        }
        Update: {
          devir_demirbas?: number | null
          gecikme_tazminati?: number
          id?: string
          onceki_ay_tahsilati?: number | null
          onceki_aydan_devir?: number
          period_id?: string
          toplam?: number
          unit_id?: string
          yeni_kalemler?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "demirbas_kayit_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demirbas_kayit_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      otp_codes: {
        Row: {
          account_id: string | null
          attempts: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          email: string | null
          expires_at: string
          id: string
          purpose: string
        }
        Insert: {
          account_id?: string | null
          attempts?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          email?: string | null
          expires_at: string
          id?: string
          purpose: string
        }
        Update: {
          account_id?: string | null
          attempts?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          purpose?: string
        }
        Relationships: [
          {
            foreignKeyName: "otp_codes_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      periods: {
        Row: {
          created_at: string
          id: string
          label: string
          month: number
          published_at: string | null
          revision: number
          status: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          month: number
          published_at?: string | null
          revision?: number
          status?: string
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          month?: number
          published_at?: string | null
          revision?: number
          status?: string
          year?: number
        }
        Relationships: []
      }
      sicak_su_kayit: {
        Row: {
          aybasi_sayac: number | null
          aysonu_sayac: number | null
          id: string
          kullanilan_m3: number | null
          m3_fiyati: number | null
          period_id: string
          sicak_su_payi_tl: number
          unit_id: string
        }
        Insert: {
          aybasi_sayac?: number | null
          aysonu_sayac?: number | null
          id?: string
          kullanilan_m3?: number | null
          m3_fiyati?: number | null
          period_id: string
          sicak_su_payi_tl?: number
          unit_id: string
        }
        Update: {
          aybasi_sayac?: number | null
          aysonu_sayac?: number | null
          id?: string
          kullanilan_m3?: number | null
          m3_fiyati?: number | null
          period_id?: string
          sicak_su_payi_tl?: number
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sicak_su_kayit_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sicak_su_kayit_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_log: {
        Row: {
          account_id: string | null
          created_at: string
          id: string
          kind: string
          message: string
          period_id: string | null
          phone: string
          provider_response: string | null
          status: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          id?: string
          kind: string
          message: string
          period_id?: string | null
          phone: string
          provider_response?: string | null
          status: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          message?: string
          period_id?: string | null
          phone?: string
          provider_response?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_log_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_log_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "periods"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          block_id: string
          daire_no: string
          id: string
          unit_no: number
        }
        Insert: {
          block_id: string
          daire_no: string
          id?: string
          unit_no: number
        }
        Update: {
          block_id?: string
          daire_no?: string
          id?: string
          unit_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "units_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "blocks"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      unit_has_active_tenant: { Args: never; Returns: boolean }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
