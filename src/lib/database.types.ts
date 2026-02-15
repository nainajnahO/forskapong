export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      teams: {
        Row: {
          id: string;
          code: string;
          name: string;
          player1: string;
          player2: string;
          wins: number;
          losses: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          player1: string;
          player2: string;
          wins?: number;
          losses?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          player1?: string;
          player2?: string;
          wins?: number;
          losses?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      matches: {
        Row: {
          id: string;
          round: number;
          team1_id: string;
          team2_id: string;
          table_number: number | null;
          scheduled_time: string | null;
          winner_id: string | null;
          loser_id: string | null;
          score_team1: number | null;
          score_team2: number | null;
          reported_by: string | null;
          confirmed: boolean;
          confirmed_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          round: number;
          team1_id: string;
          team2_id: string;
          table_number?: number | null;
          scheduled_time?: string | null;
          winner_id?: string | null;
          loser_id?: string | null;
          score_team1?: number | null;
          score_team2?: number | null;
          reported_by?: string | null;
          confirmed?: boolean;
          confirmed_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          round?: number;
          team1_id?: string;
          team2_id?: string;
          table_number?: number | null;
          scheduled_time?: string | null;
          winner_id?: string | null;
          loser_id?: string | null;
          score_team1?: number | null;
          score_team2?: number | null;
          reported_by?: string | null;
          confirmed?: boolean;
          confirmed_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'matches_team1_id_fkey';
            columns: ['team1_id'];
            isOneToOne: false;
            referencedRelation: 'teams';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'matches_team2_id_fkey';
            columns: ['team2_id'];
            isOneToOne: false;
            referencedRelation: 'teams';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'matches_winner_id_fkey';
            columns: ['winner_id'];
            isOneToOne: false;
            referencedRelation: 'teams';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'matches_loser_id_fkey';
            columns: ['loser_id'];
            isOneToOne: false;
            referencedRelation: 'teams';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'matches_reported_by_fkey';
            columns: ['reported_by'];
            isOneToOne: false;
            referencedRelation: 'teams';
            referencedColumns: ['id'];
          },
        ];
      };
      tournament: {
        Row: {
          id: number;
          current_round: number;
          total_rounds: number;
          status: string;
        };
        Insert: {
          id?: number;
          current_round?: number;
          total_rounds?: number;
          status?: string;
        };
        Update: {
          id?: number;
          current_round?: number;
          total_rounds?: number;
          status?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// ─── Convenience types ───────────────────────────

export type Team = Database['public']['Tables']['teams']['Row'];
export type Match = Database['public']['Tables']['matches']['Row'];
export type Tournament = Database['public']['Tables']['tournament']['Row'];
