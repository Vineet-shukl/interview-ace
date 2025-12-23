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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      body_language_metrics: {
        Row: {
          created_at: string
          eye_contact_score: number | null
          id: string
          looking_away_count: number | null
          nervous_movements: number | null
          notes: string | null
          person_detected_count: number | null
          phone_detected_count: number | null
          posture_score: number | null
          response_id: string
        }
        Insert: {
          created_at?: string
          eye_contact_score?: number | null
          id?: string
          looking_away_count?: number | null
          nervous_movements?: number | null
          notes?: string | null
          person_detected_count?: number | null
          phone_detected_count?: number | null
          posture_score?: number | null
          response_id: string
        }
        Update: {
          created_at?: string
          eye_contact_score?: number | null
          id?: string
          looking_away_count?: number | null
          nervous_movements?: number | null
          notes?: string | null
          person_detected_count?: number | null
          phone_detected_count?: number | null
          posture_score?: number | null
          response_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "body_language_metrics_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "interview_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_questions: {
        Row: {
          category_id: string | null
          created_at: string
          difficulty: string
          id: string
          industry: string | null
          question_text: string
          role: string | null
          sample_answer: string | null
          tips: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          difficulty?: string
          id?: string
          industry?: string | null
          question_text: string
          role?: string | null
          sample_answer?: string | null
          tips?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          difficulty?: string
          id?: string
          industry?: string | null
          question_text?: string
          role?: string | null
          sample_answer?: string | null
          tips?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interview_questions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "question_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_responses: {
        Row: {
          ai_feedback: string | null
          audio_url: string | null
          clarity_score: number | null
          confidence_score: number | null
          created_at: string
          duration_seconds: number | null
          id: string
          question_id: string | null
          question_text: string
          relevance_score: number | null
          response_text: string | null
          session_id: string
        }
        Insert: {
          ai_feedback?: string | null
          audio_url?: string | null
          clarity_score?: number | null
          confidence_score?: number | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          question_id?: string | null
          question_text: string
          relevance_score?: number | null
          response_text?: string | null
          session_id: string
        }
        Update: {
          ai_feedback?: string | null
          audio_url?: string | null
          clarity_score?: number | null
          confidence_score?: number | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          question_id?: string | null
          question_text?: string
          relevance_score?: number | null
          response_text?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "interview_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_responses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_sessions: {
        Row: {
          created_at: string
          duration_minutes: number | null
          ended_at: string | null
          id: string
          notes: string | null
          overall_score: number | null
          scheduled_at: string | null
          session_type: string
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          overall_score?: number | null
          scheduled_at?: string | null
          session_type?: string
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          overall_score?: number | null
          scheduled_at?: string | null
          session_type?: string
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mock_interview_invites: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          invitee_email: string
          inviter_id: string
          session_id: string
          status: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          invitee_email: string
          inviter_id: string
          session_id: string
          status?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          invitee_email?: string
          inviter_id?: string
          session_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "mock_interview_invites_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      question_categories: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_devices: {
        Row: {
          browser: string | null
          created_at: string
          device_fingerprint: string
          device_name: string | null
          id: string
          ip_address: string | null
          last_login_at: string
          os: string | null
          user_id: string
        }
        Insert: {
          browser?: string | null
          created_at?: string
          device_fingerprint: string
          device_name?: string | null
          id?: string
          ip_address?: string | null
          last_login_at?: string
          os?: string | null
          user_id: string
        }
        Update: {
          browser?: string | null
          created_at?: string
          device_fingerprint?: string
          device_name?: string | null
          id?: string
          ip_address?: string | null
          last_login_at?: string
          os?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          auto_record_sessions: boolean
          created_at: string
          default_difficulty: string
          email_notifications: boolean
          feedback_alerts: boolean
          id: string
          practice_reminders: boolean
          session_duration: number
          show_cheating_alerts: boolean
          speech_pitch: number | null
          speech_rate: number | null
          updated_at: string
          user_id: string
          voice_uri: string | null
          weekly_digest: boolean
        }
        Insert: {
          auto_record_sessions?: boolean
          created_at?: string
          default_difficulty?: string
          email_notifications?: boolean
          feedback_alerts?: boolean
          id?: string
          practice_reminders?: boolean
          session_duration?: number
          show_cheating_alerts?: boolean
          speech_pitch?: number | null
          speech_rate?: number | null
          updated_at?: string
          user_id: string
          voice_uri?: string | null
          weekly_digest?: boolean
        }
        Update: {
          auto_record_sessions?: boolean
          created_at?: string
          default_difficulty?: string
          email_notifications?: boolean
          feedback_alerts?: boolean
          id?: string
          practice_reminders?: boolean
          session_duration?: number
          show_cheating_alerts?: boolean
          speech_pitch?: number | null
          speech_rate?: number | null
          updated_at?: string
          user_id?: string
          voice_uri?: string | null
          weekly_digest?: boolean
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
