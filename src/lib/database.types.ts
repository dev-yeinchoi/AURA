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
  private: {
    Tables: {
      recruitment_applications: {
        Row: {
          birth_date: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          participant_id: string | null
          phone: string | null
          reserved_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          birth_date?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          participant_id?: string | null
          phone?: string | null
          reserved_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          birth_date?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          participant_id?: string | null
          phone?: string | null
          reserved_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
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
  public: {
    Tables: {
      case_expansion_events: {
        Row: { id: string; participant_id: string; round_no: number; round_id: string; risk_level: string; employee_id: string; expanded: boolean; changed_at: string; event_key: string | null; origin: string; open_duration_ms: number | null }
        Insert: { id?: string; participant_id: string; round_no: number; round_id: string; risk_level: string; employee_id: string; expanded: boolean; changed_at?: string; event_key?: string | null; origin?: string; open_duration_ms?: number | null }
        Update: { id?: string; participant_id?: string; round_no?: number; round_id?: string; risk_level?: string; employee_id?: string; expanded?: boolean; changed_at?: string; event_key?: string | null; origin?: string; open_duration_ms?: number | null }
        Relationships: []
      }
      attention_check_responses: {
        Row: { participant_id: string; round_no: number; round_id: string; risk_level: string; selected_option: number; correct_option: number; is_correct: boolean; response_ms: number | null; submitted_at: string }
        Insert: { participant_id: string; round_no: number; round_id: string; risk_level: string; selected_option: number; correct_option: number; is_correct: boolean; response_ms?: number | null; submitted_at?: string }
        Update: { participant_id?: string; round_no?: number; round_id?: string; risk_level?: string; selected_option?: number; correct_option?: number; is_correct?: boolean; response_ms?: number | null; submitted_at?: string }
        Relationships: []
      }
      scenario_segment_visits: {
        Row: { id: string; participant_id: string; round_no: number; round_id: string; risk_level: string; segment_no: number; entered_at: string; left_at: string | null; wall_ms: number | null; exit_reason: string | null }
        Insert: { id?: string; participant_id: string; round_no: number; round_id: string; risk_level: string; segment_no: number; entered_at?: string; left_at?: string | null; wall_ms?: number | null; exit_reason?: string | null }
        Update: { id?: string; participant_id?: string; round_no?: number; round_id?: string; risk_level?: string; segment_no?: number; entered_at?: string; left_at?: string | null; wall_ms?: number | null; exit_reason?: string | null }
        Relationships: []
      }
      case_expansion_summary: {
        Row: { participant_id: string; round_no: number; round_id: string; risk_level: string; employee_id: string; first_viewed_at: string | null; view_count: number; final_expanded: boolean; open_started_at: string | null; accumulated_open_ms: number; updated_at: string }
        Insert: { participant_id: string; round_no: number; round_id: string; risk_level: string; employee_id: string; first_viewed_at?: string | null; view_count?: number; final_expanded?: boolean; open_started_at?: string | null; accumulated_open_ms?: number; updated_at?: string }
        Update: { participant_id?: string; round_no?: number; round_id?: string; risk_level?: string; employee_id?: string; first_viewed_at?: string | null; view_count?: number; final_expanded?: boolean; open_started_at?: string | null; accumulated_open_ms?: number; updated_at?: string }
        Relationships: []
      }
      assignments: {
        Row: {
          assigned_at: string
          authority_cue: string
          explanation_type: string
          participant_id: string
          sequence_code: string
          stimulus_version: string
        }
        Insert: {
          assigned_at?: string
          authority_cue: string
          explanation_type: string
          participant_id: string
          sequence_code: string
          stimulus_version: string
        }
        Update: {
          assigned_at?: string
          authority_cue?: string
          explanation_type?: string
          participant_id?: string
          sequence_code?: string
          stimulus_version?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: true
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_stimulus_version_fkey"
            columns: ["stimulus_version"]
            isOneToOne: false
            referencedRelation: "stimulus_sets"
            referencedColumns: ["version"]
          },
        ]
      }
      consent_records: {
        Row: {
          consent_ms: number
          consent_sha256: string
          decided_at: string
          decision: string
          document_version: string
          information_ms: number
          information_sha256: string
          participant_id: string
        }
        Insert: {
          consent_ms: number
          consent_sha256: string
          decided_at?: string
          decision: string
          document_version: string
          information_ms: number
          information_sha256: string
          participant_id: string
        }
        Update: {
          consent_ms?: number
          consent_sha256?: string
          decided_at?: string
          decision?: string
          document_version?: string
          information_ms?: number
          information_sha256?: string
          participant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consent_records_document_version_fkey"
            columns: ["document_version"]
            isOneToOne: false
            referencedRelation: "study_documents"
            referencedColumns: ["version"]
          },
          {
            foreignKeyName: "consent_records_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: true
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      decisions: {
        Row: {
          choice: number
          employee_id: string
          participant_id: string
          round_no: number
          selected_at: string
          stage: string
          submitted_at: string | null
        }
        Insert: {
          choice: number
          employee_id: string
          participant_id: string
          round_no: number
          selected_at: string
          stage: string
          submitted_at?: string | null
        }
        Update: {
          choice?: number
          employee_id?: string
          participant_id?: string
          round_no?: number
          selected_at?: string
          stage?: string
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "decisions_participant_id_round_no_fkey"
            columns: ["participant_id", "round_no"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["participant_id", "round_no"]
          },
        ]
      }
      page_visits: {
        Row: {
          active_ms: number
          entered_at: string
          exit_reason: string | null
          id: string
          last_seen_at: string
          left_at: string | null
          page_key: string
          participant_id: string
          round_no: number | null
          wall_ms: number | null
        }
        Insert: {
          active_ms?: number
          entered_at?: string
          exit_reason?: string | null
          id?: string
          last_seen_at?: string
          left_at?: string | null
          page_key: string
          participant_id: string
          round_no?: number | null
          wall_ms?: number | null
        }
        Update: {
          active_ms?: number
          entered_at?: string
          exit_reason?: string | null
          id?: string
          last_seen_at?: string
          left_at?: string | null
          page_key?: string
          participant_id?: string
          round_no?: number | null
          wall_ms?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "page_visits_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "page_visits_participant_id_round_no_fkey"
            columns: ["participant_id", "round_no"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["participant_id", "round_no"]
          },
        ]
      }
      participant_credentials: {
        Row: {
          failed_attempts: number
          issued_at: string
          locked_until: string | null
          participant_id: string
          pin_digest: string
          pin_expires_at: string
          pin_used_at: string | null
        }
        Insert: {
          failed_attempts?: number
          issued_at?: string
          locked_until?: string | null
          participant_id: string
          pin_digest: string
          pin_expires_at: string
          pin_used_at?: string | null
        }
        Update: {
          failed_attempts?: number
          issued_at?: string
          locked_until?: string | null
          participant_id?: string
          pin_digest?: string
          pin_expires_at?: string
          pin_used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "participant_credentials_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: true
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      participant_identity_attempts: {
        Row: { participant_id: string; failed_attempts: number; locked_until: string | null }
        Insert: { participant_id: string; failed_attempts?: number; locked_until?: string | null }
        Update: { participant_id?: string; failed_attempts?: number; locked_until?: string | null }
        Relationships: []
      }
      participant_identity_challenges: {
        Row: { token_digest: string; participant_id: string; expires_at: string; consumed_at: string | null }
        Insert: { token_digest: string; participant_id: string; expires_at: string; consumed_at?: string | null }
        Update: { token_digest?: string; participant_id?: string; expires_at?: string; consumed_at?: string | null }
        Relationships: []
      }
      participant_sessions: {
        Row: {
          created_at: string
          expires_at: string
          participant_id: string
          revoked_at: string | null
          token_digest: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          participant_id: string
          revoked_at?: string | null
          token_digest: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          participant_id?: string
          revoked_at?: string | null
          token_digest?: string
        }
        Relationships: [
          {
            foreignKeyName: "participant_sessions_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      participants: {
        Row: {
          completed_at: string | null
          consent_document_version: string | null
          created_at: string
          id: string
          online_consent_confirmed_at: string | null
          paper_consent_confirmed_at: string | null
          participant_code: string
          phase: string
          started_at: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          consent_document_version?: string | null
          created_at?: string
          id?: string
          online_consent_confirmed_at?: string | null
          paper_consent_confirmed_at?: string | null
          participant_code: string
          phase: string
          started_at?: string | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          consent_document_version?: string | null
          created_at?: string
          id?: string
          online_consent_confirmed_at?: string | null
          paper_consent_confirmed_at?: string | null
          participant_code?: string
          phase?: string
          started_at?: string | null
          status?: string
        }
        Relationships: []
      }
      rounds: {
        Row: {
          completed_at: string | null
          form_code: string
          id: string
          participant_id: string
          risk_level: string
          round_no: number
          started_at: string | null
        }
        Insert: {
          completed_at?: string | null
          form_code: string
          id?: string
          participant_id: string
          risk_level: string
          round_no: number
          started_at?: string | null
        }
        Update: {
          completed_at?: string | null
          form_code?: string
          id?: string
          participant_id?: string
          risk_level?: string
          round_no?: number
          started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rounds_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      stimulus_sets: {
        Row: {
          created_at: string
          payload: Json
          sha256: string
          version: string
        }
        Insert: {
          created_at?: string
          payload: Json
          sha256: string
          version: string
        }
        Update: {
          created_at?: string
          payload?: Json
          sha256?: string
          version?: string
        }
        Relationships: []
      }
      study_documents: {
        Row: {
          active: boolean
          consent_path: string
          consent_sha256: string
          created_at: string
          information_path: string
          information_sha256: string
          version: string
        }
        Insert: {
          active?: boolean
          consent_path: string
          consent_sha256: string
          created_at?: string
          information_path: string
          information_sha256: string
          version: string
        }
        Update: {
          active?: boolean
          consent_path?: string
          consent_sha256?: string
          created_at?: string
          information_path?: string
          information_sha256?: string
          version?: string
        }
        Relationships: []
      }
      survey_answers: {
        Row: {
          answer_number: number | null
          answer_text: string | null
          figma_node_id: string | null
          id: string
          instrument: string
          participant_id: string
          question_key: string
          round_no: number | null
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          answer_number?: number | null
          answer_text?: string | null
          figma_node_id?: string | null
          id?: string
          instrument: string
          participant_id: string
          question_key: string
          round_no?: number | null
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          answer_number?: number | null
          answer_text?: string | null
          figma_node_id?: string | null
          id?: string
          instrument?: string
          participant_id?: string
          question_key?: string
          round_no?: number | null
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_answers_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_answers_participant_id_round_no_fkey"
            columns: ["participant_id", "round_no"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["participant_id", "round_no"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      record_scenario_segment: {
        Args: { p_participant_id: string; p_round_no: number; p_segment_no: number | null; p_exit_reason?: string }
        Returns: undefined
      }
      record_case_expansion: {
        Args: { p_participant_id: string; p_round_no: number; p_employee_id: string; p_expanded: boolean; p_event_key?: string | null }
        Returns: Database["public"]["Tables"]["case_expansion_summary"]["Row"]
      }
      close_open_case_expansions: {
        Args: { p_participant_id: string; p_round_no: number; p_origin?: string }
        Returns: number
      }
      verify_participant_identity: {
        Args: { p_code: string; p_phone_last4: string }
        Returns: { participantId: string; participantCode: string; maskedName: string; maskedPhone: string } | null
      }
      issue_participant_identity: {
        Args: { p_code: string; p_phase: string; p_application_id: string }
        Returns: string
      }
      link_participant_identity: {
        Args: { p_code: string; p_application_id: string }
        Returns: boolean
      }
      activate_study_documents: {
        Args: {
          p_consent_path: string
          p_consent_sha256: string
          p_information_path: string
          p_information_sha256: string
          p_version: string
        }
        Returns: undefined
      }
      issue_participant: {
        Args: {
          p_code: string
          p_expires_at: string
          p_phase: string
          p_pin_digest: string
        }
        Returns: string
      }
      record_online_consent: {
        Args: {
          p_consent_ms: number
          p_decision: string
          p_document_version: string
          p_information_ms: number
          p_participant_id: string
        }
        Returns: undefined
      }
      redeem_participant_pin: {
        Args: { p_code: string; p_pin_digest: string }
        Returns: string
      }
      reissue_participant_pin: {
        Args: { p_code: string; p_expires_at: string; p_pin_digest: string }
        Returns: boolean
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
  private: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
