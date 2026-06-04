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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_config: {
        Row: {
          admin_code: string
          id: number
        }
        Insert: {
          admin_code?: string
          id?: number
        }
        Update: {
          admin_code?: string
          id?: number
        }
        Relationships: []
      }
      matches: {
        Row: {
          confirmed: boolean
          confirmed_by: string | null
          created_at: string
          id: string
          loser_id: string | null
          reported_by: string | null
          round: number
          scheduled_time: string | null
          score_team1: number | null
          score_team2: number | null
          table_number: number | null
          team1_id: string
          team2_id: string
          wave: number
          winner_id: string | null
        }
        Insert: {
          confirmed?: boolean
          confirmed_by?: string | null
          created_at?: string
          id?: string
          loser_id?: string | null
          reported_by?: string | null
          round: number
          scheduled_time?: string | null
          score_team1?: number | null
          score_team2?: number | null
          table_number?: number | null
          team1_id: string
          team2_id: string
          wave?: number
          winner_id?: string | null
        }
        Update: {
          confirmed?: boolean
          confirmed_by?: string | null
          created_at?: string
          id?: string
          loser_id?: string | null
          reported_by?: string | null
          round?: number
          scheduled_time?: string | null
          score_team1?: number | null
          score_team2?: number | null
          table_number?: number | null
          team1_id?: string
          team2_id?: string
          wave?: number
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_loser_id_fkey"
            columns: ["loser_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team1_id_fkey"
            columns: ["team1_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team2_id_fkey"
            columns: ["team2_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_codes: {
        Row: {
          code: string
          team_id: string
        }
        Insert: {
          code: string
          team_id: string
        }
        Update: {
          code?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_codes_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          checked_in: boolean
          created_at: string
          id: string
          losses: number
          name: string
          player1: string | null
          player2: string | null
          wins: number
        }
        Insert: {
          checked_in?: boolean
          created_at?: string
          id?: string
          losses?: number
          name: string
          player1?: string | null
          player2?: string | null
          wins?: number
        }
        Update: {
          checked_in?: boolean
          created_at?: string
          id?: string
          losses?: number
          name?: string
          player1?: string | null
          player2?: string | null
          wins?: number
        }
        Relationships: []
      }
      tiebreak_decisions: {
        Row: {
          created_at: string
          cutoff: number
          id: string
          team1_id: string
          team2_id: string
          updated_at: string
          winner_team_id: string
        }
        Insert: {
          created_at?: string
          cutoff: number
          id?: string
          team1_id: string
          team2_id: string
          updated_at?: string
          winner_team_id: string
        }
        Update: {
          created_at?: string
          cutoff?: number
          id?: string
          team1_id?: string
          team2_id?: string
          updated_at?: string
          winner_team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tiebreak_decisions_team1_id_fkey"
            columns: ["team1_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tiebreak_decisions_team2_id_fkey"
            columns: ["team2_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tiebreak_decisions_winner_team_id_fkey"
            columns: ["winner_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      tiebreak_order: {
        Row: {
          created_at: string
          cutoff: number
          rank: number
          team_id: string
        }
        Insert: {
          created_at?: string
          cutoff: number
          rank: number
          team_id: string
        }
        Update: {
          created_at?: string
          cutoff?: number
          rank?: number
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tiebreak_order_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament: {
        Row: {
          current_round: number
          id: number
          status: string
          table_count: number
          total_rounds: number
        }
        Insert: {
          current_round?: number
          id?: number
          status?: string
          table_count?: number
          total_rounds?: number
        }
        Update: {
          current_round?: number
          id?: number
          status?: string
          table_count?: number
          total_rounds?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_clear_round: {
        Args: { admin_code: string; p_round: number }
        Returns: number
      }
      admin_create_matches: {
        Args: { admin_code: string; rows: Json }
        Returns: {
          confirmed: boolean
          confirmed_by: string | null
          created_at: string
          id: string
          loser_id: string | null
          reported_by: string | null
          round: number
          scheduled_time: string | null
          score_team1: number | null
          score_team2: number | null
          table_number: number | null
          team1_id: string
          team2_id: string
          wave: number
          winner_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "matches"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_delete_team: {
        Args: { admin_code: string; p_team_id: string }
        Returns: number
      }
      admin_delete_unchecked: { Args: { admin_code: string }; Returns: number }
      admin_list_teams: {
        Args: { admin_code: string }
        Returns: {
          checked_in: boolean
          code: string
          created_at: string
          id: string
          losses: number
          name: string
          player1: string
          player2: string
          wins: number
        }[]
      }
      admin_reset_tournament: {
        Args: { admin_code: string }
        Returns: undefined
      }
      admin_set_checkin: {
        Args: { admin_code: string; p_value: boolean; p_team_id?: string }
        Returns: number
      }
      admin_set_match_result: {
        Args: {
          admin_code: string
          p_loser_id: string
          p_match_id: string
          p_score_team1: number
          p_score_team2: number
          p_winner_id: string
        }
        Returns: {
          confirmed: boolean
          confirmed_by: string | null
          created_at: string
          id: string
          loser_id: string | null
          reported_by: string | null
          round: number
          scheduled_time: string | null
          score_team1: number | null
          score_team2: number | null
          table_number: number | null
          team1_id: string
          team2_id: string
          wave: number
          winner_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "matches"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_set_tournament: {
        Args: {
          admin_code: string
          p_current_round?: number
          p_status?: string
          p_table_count?: number
          p_total_rounds?: number
        }
        Returns: {
          current_round: number
          id: number
          status: string
          table_count: number
          total_rounds: number
        }
        SetofOptions: {
          from: "*"
          to: "tournament"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_update_team: {
        Args: {
          admin_code: string
          p_name: string
          p_player1: string
          p_player2: string
          p_team_id: string
        }
        Returns: {
          checked_in: boolean
          created_at: string
          id: string
          losses: number
          name: string
          player1: string | null
          player2: string | null
          wins: number
        }
        SetofOptions: {
          from: "*"
          to: "teams"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      bulk_register_teams: {
        Args: { admin_code: string; team_names: string[] }
        Returns: {
          code: string
          id: string
          name: string
        }[]
      }
      generate_team_code: {
        Args: { excluded_codes?: string[] }
        Returns: string
      }
      login_team: {
        Args: { p_code: string }
        Returns: {
          code: string
          id: string
          name: string
        }[]
      }
      report_match_result: {
        Args: {
          p_code: string
          p_loser_cups: number
          p_match_id: string
          p_we_are_winner: boolean
        }
        Returns: {
          confirmed: boolean
          confirmed_by: string | null
          created_at: string
          id: string
          loser_id: string | null
          reported_by: string | null
          round: number
          scheduled_time: string | null
          score_team1: number | null
          score_team2: number | null
          table_number: number | null
          team1_id: string
          team2_id: string
          wave: number
          winner_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "matches"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      respond_match_result: {
        Args: { p_action: string; p_code: string; p_match_id: string }
        Returns: {
          confirmed: boolean
          confirmed_by: string | null
          created_at: string
          id: string
          loser_id: string | null
          reported_by: string | null
          round: number
          scheduled_time: string | null
          score_team1: number | null
          score_team2: number | null
          table_number: number | null
          team1_id: string
          team2_id: string
          wave: number
          winner_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "matches"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_tiebreak_decision: {
        Args: {
          admin_code: string
          p_cutoff: number
          p_team1_id: string
          p_team2_id: string
          p_winner_team_id: string
        }
        Returns: {
          created_at: string
          cutoff: number
          id: string
          team1_id: string
          team2_id: string
          updated_at: string
          winner_team_id: string
        }
        SetofOptions: {
          from: "*"
          to: "tiebreak_decisions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_tiebreak_order: {
        Args: { admin_code: string; p_cutoff: number; p_team_ids: string[] }
        Returns: {
          created_at: string
          cutoff: number
          rank: number
          team_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "tiebreak_order"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      update_team_profile: {
        Args: { p_code: string; p_player1: string; p_player2: string }
        Returns: {
          checked_in: boolean
          created_at: string
          id: string
          losses: number
          name: string
          player1: string | null
          player2: string | null
          wins: number
        }
        SetofOptions: {
          from: "*"
          to: "teams"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      verify_admin_code: { Args: { code: string }; Returns: boolean }
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

// ─── Convenience types ───────────────────────────

export type Team = Database['public']['Tables']['teams']['Row'];
export type Match = Database['public']['Tables']['matches']['Row'];
export type Tournament = Database['public']['Tables']['tournament']['Row'];

/** A team row joined with its access code, as returned by the admin_list_teams RPC.
 *  Codes live in the locked `team_codes` vault, so `teams` itself has no `code`. */
export type AdminTeam = Database['public']['Functions']['admin_list_teams']['Returns'][number];
