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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
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
  public: {
    Tables: {
      accounts: {
        Row: {
          amount: number
          created_at: string
          created_by: string
          description: string
          flightlog_id: string | null
          id: string
          inserted_at: string
          reversal_transaction_id: string | null
          reversed_at: string | null
          reversed_by: string | null
          reverses_transaction_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by: string
          description: string
          flightlog_id?: string | null
          id?: string
          inserted_at?: string
          reversal_transaction_id?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
          reverses_transaction_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string
          description?: string
          flightlog_id?: string | null
          id?: string
          inserted_at?: string
          reversal_transaction_id?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
          reverses_transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_balances"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "accounts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_flightlog_id_fkey"
            columns: ["flightlog_id"]
            isOneToOne: false
            referencedRelation: "flightlog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_flightlog_id_fkey"
            columns: ["flightlog_id"]
            isOneToOne: false
            referencedRelation: "flightlog_with_operation_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_flightlog_id_fkey"
            columns: ["flightlog_id"]
            isOneToOne: false
            referencedRelation: "flightlog_with_times"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_flightlog_id_fkey"
            columns: ["flightlog_id"]
            isOneToOne: false
            referencedRelation: "uncharged_flights"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_reversal_transaction_id_fkey"
            columns: ["reversal_transaction_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_reversed_by_fkey"
            columns: ["reversed_by"]
            isOneToOne: false
            referencedRelation: "user_balances"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "accounts_reversed_by_fkey"
            columns: ["reversed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_reverses_transaction_id_fkey"
            columns: ["reverses_transaction_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_balances"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      aircraft_airport_fees: {
        Row: {
          airport_id: string
          approach_fee: number
          created_at: string | null
          id: string
          landing_fee: number
          noise_fee: number
          notes: string | null
          parking_fee: number
          passenger_fee: number
          plane_id: string
          updated_at: string | null
        }
        Insert: {
          airport_id: string
          approach_fee?: number
          created_at?: string | null
          id?: string
          landing_fee?: number
          noise_fee?: number
          notes?: string | null
          parking_fee?: number
          passenger_fee?: number
          plane_id: string
          updated_at?: string | null
        }
        Update: {
          airport_id?: string
          approach_fee?: number
          created_at?: string | null
          id?: string
          landing_fee?: number
          noise_fee?: number
          notes?: string | null
          parking_fee?: number
          passenger_fee?: number
          plane_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aircraft_airport_fees_airport_id_fkey"
            columns: ["airport_id"]
            isOneToOne: false
            referencedRelation: "airports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aircraft_airport_fees_plane_id_fkey"
            columns: ["plane_id"]
            isOneToOne: false
            referencedRelation: "aircraft_totals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aircraft_airport_fees_plane_id_fkey"
            columns: ["plane_id"]
            isOneToOne: false
            referencedRelation: "aircraft_with_maintenance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aircraft_airport_fees_plane_id_fkey"
            columns: ["plane_id"]
            isOneToOne: false
            referencedRelation: "planes"
            referencedColumns: ["id"]
          },
        ]
      }
      aircraft_components: {
        Row: {
          component_hours_offset: number
          component_type: Database["public"]["Enums"]["component_type"]
          created_at: string
          created_by: string
          hours_at_installation: number
          id: string
          installation_mx_record_id: string | null
          installed_at: string
          installed_by: string | null
          manufacturer: string | null
          model: string | null
          notes: string | null
          part_number: string | null
          plane_id: string
          position: string | null
          removal_mx_record_id: string | null
          removal_reason: string | null
          removed_at: string | null
          removed_by: string | null
          serial_number: string | null
          status: Database["public"]["Enums"]["component_status"]
          tbo_hours: number
          updated_at: string
        }
        Insert: {
          component_hours_offset?: number
          component_type: Database["public"]["Enums"]["component_type"]
          created_at?: string
          created_by: string
          hours_at_installation?: number
          id?: string
          installation_mx_record_id?: string | null
          installed_at?: string
          installed_by?: string | null
          manufacturer?: string | null
          model?: string | null
          notes?: string | null
          part_number?: string | null
          plane_id: string
          position?: string | null
          removal_mx_record_id?: string | null
          removal_reason?: string | null
          removed_at?: string | null
          removed_by?: string | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["component_status"]
          tbo_hours: number
          updated_at?: string
        }
        Update: {
          component_hours_offset?: number
          component_type?: Database["public"]["Enums"]["component_type"]
          created_at?: string
          created_by?: string
          hours_at_installation?: number
          id?: string
          installation_mx_record_id?: string | null
          installed_at?: string
          installed_by?: string | null
          manufacturer?: string | null
          model?: string | null
          notes?: string | null
          part_number?: string | null
          plane_id?: string
          position?: string | null
          removal_mx_record_id?: string | null
          removal_reason?: string | null
          removed_at?: string | null
          removed_by?: string | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["component_status"]
          tbo_hours?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "aircraft_components_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_balances"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "aircraft_components_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aircraft_components_installation_mx_record_id_fkey"
            columns: ["installation_mx_record_id"]
            isOneToOne: false
            referencedRelation: "maintenance_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aircraft_components_installed_by_fkey"
            columns: ["installed_by"]
            isOneToOne: false
            referencedRelation: "user_balances"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "aircraft_components_installed_by_fkey"
            columns: ["installed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aircraft_components_plane_id_fkey"
            columns: ["plane_id"]
            isOneToOne: false
            referencedRelation: "aircraft_totals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aircraft_components_plane_id_fkey"
            columns: ["plane_id"]
            isOneToOne: false
            referencedRelation: "aircraft_with_maintenance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aircraft_components_plane_id_fkey"
            columns: ["plane_id"]
            isOneToOne: false
            referencedRelation: "planes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aircraft_components_removal_mx_record_id_fkey"
            columns: ["removal_mx_record_id"]
            isOneToOne: false
            referencedRelation: "maintenance_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aircraft_components_removed_by_fkey"
            columns: ["removed_by"]
            isOneToOne: false
            referencedRelation: "user_balances"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "aircraft_components_removed_by_fkey"
            columns: ["removed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      airports: {
        Row: {
          airport_name: string
          created_at: string | null
          icao_code: string
          id: string
          notes: string | null
          updated_at: string | null
        }
        Insert: {
          airport_name: string
          created_at?: string | null
          icao_code: string
          id?: string
          notes?: string | null
          updated_at?: string | null
        }
        Update: {
          airport_name?: string
          created_at?: string | null
          icao_code?: string
          id?: string
          notes?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      component_tbo_presets: {
        Row: {
          component_type: Database["public"]["Enums"]["component_type"]
          created_at: string
          description: string | null
          id: string
          is_common: boolean
          manufacturer: string
          model: string
          tbo_hours: number
          updated_at: string
        }
        Insert: {
          component_type: Database["public"]["Enums"]["component_type"]
          created_at?: string
          description?: string | null
          id?: string
          is_common?: boolean
          manufacturer: string
          model: string
          tbo_hours: number
          updated_at?: string
        }
        Update: {
          component_type?: Database["public"]["Enums"]["component_type"]
          created_at?: string
          description?: string | null
          id?: string
          is_common?: boolean
          manufacturer?: string
          model?: string
          tbo_hours?: number
          updated_at?: string
        }
        Relationships: []
      }
      cost_center_transactions: {
        Row: {
          amount: number
          cost_center_id: string
          created_at: string
          created_by: string
          description: string
          flightlog_id: string | null
          id: string
          inserted_at: string
          reversal_transaction_id: string | null
          reversed_at: string | null
          reversed_by: string | null
          reverses_transaction_id: string | null
        }
        Insert: {
          amount: number
          cost_center_id: string
          created_at?: string
          created_by: string
          description: string
          flightlog_id?: string | null
          id?: string
          inserted_at?: string
          reversal_transaction_id?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
          reverses_transaction_id?: string | null
        }
        Update: {
          amount?: number
          cost_center_id?: string
          created_at?: string
          created_by?: string
          description?: string
          flightlog_id?: string | null
          id?: string
          inserted_at?: string
          reversal_transaction_id?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
          reverses_transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_center_transactions_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_center_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_balances"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "cost_center_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_center_transactions_flightlog_id_fkey"
            columns: ["flightlog_id"]
            isOneToOne: true
            referencedRelation: "flightlog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_center_transactions_flightlog_id_fkey"
            columns: ["flightlog_id"]
            isOneToOne: true
            referencedRelation: "flightlog_with_operation_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_center_transactions_flightlog_id_fkey"
            columns: ["flightlog_id"]
            isOneToOne: true
            referencedRelation: "flightlog_with_times"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_center_transactions_flightlog_id_fkey"
            columns: ["flightlog_id"]
            isOneToOne: true
            referencedRelation: "uncharged_flights"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_center_transactions_reversal_transaction_id_fkey"
            columns: ["reversal_transaction_id"]
            isOneToOne: false
            referencedRelation: "cost_center_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_center_transactions_reversed_by_fkey"
            columns: ["reversed_by"]
            isOneToOne: false
            referencedRelation: "user_balances"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "cost_center_transactions_reversed_by_fkey"
            columns: ["reversed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_center_transactions_reverses_transaction_id_fkey"
            columns: ["reverses_transaction_id"]
            isOneToOne: false
            referencedRelation: "cost_center_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_centers: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      document_types: {
        Row: {
          category: string | null
          created_at: string | null
          default_validity_months: number | null
          description: string | null
          expires: boolean | null
          expiry_type: string | null
          id: string
          mandatory: boolean | null
          name: string
          required_for_functions: string[] | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          default_validity_months?: number | null
          description?: string | null
          expires?: boolean | null
          expiry_type?: string | null
          id?: string
          mandatory?: boolean | null
          name: string
          required_for_functions?: string[] | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          default_validity_months?: number | null
          description?: string | null
          expires?: boolean | null
          expiry_type?: string | null
          id?: string
          mandatory?: boolean | null
          name?: string
          required_for_functions?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          approved: boolean
          approved_at: string | null
          approved_by: string | null
          blocks_aircraft: boolean
          category: string | null
          document_type_id: string | null
          expiry_date: string | null
          file_url: string
          id: string
          name: string
          plane_id: string | null
          tags: string[] | null
          uploaded_at: string
          uploaded_by: string
          user_id: string | null
        }
        Insert: {
          approved?: boolean
          approved_at?: string | null
          approved_by?: string | null
          blocks_aircraft?: boolean
          category?: string | null
          document_type_id?: string | null
          expiry_date?: string | null
          file_url: string
          id?: string
          name: string
          plane_id?: string | null
          tags?: string[] | null
          uploaded_at?: string
          uploaded_by: string
          user_id?: string | null
        }
        Update: {
          approved?: boolean
          approved_at?: string | null
          approved_by?: string | null
          blocks_aircraft?: boolean
          category?: string | null
          document_type_id?: string | null
          expiry_date?: string | null
          file_url?: string
          id?: string
          name?: string
          plane_id?: string | null
          tags?: string[] | null
          uploaded_at?: string
          uploaded_by?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_balances"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "documents_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_document_type_id_fkey"
            columns: ["document_type_id"]
            isOneToOne: false
            referencedRelation: "document_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_plane_id_fkey"
            columns: ["plane_id"]
            isOneToOne: false
            referencedRelation: "aircraft_totals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_plane_id_fkey"
            columns: ["plane_id"]
            isOneToOne: false
            referencedRelation: "aircraft_with_maintenance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_plane_id_fkey"
            columns: ["plane_id"]
            isOneToOne: false
            referencedRelation: "planes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "user_balances"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_balances"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      flightlog: {
        Row: {
          block_off: string
          block_on: string
          charged: boolean
          charged_at: string | null
          charged_by: string | null
          copilot_id: string | null
          created_at: string
          fuel: number | null
          icao_departure: string | null
          icao_destination: string | null
          id: string
          landing_time: string
          landings: number
          locked: boolean
          m_and_b_pdf_url: string | null
          needs_board_review: boolean
          oil: number | null
          operation_type_id: string | null
          passengers: number | null
          pilot_id: string
          plane_id: string
          takeoff_time: string
          updated_at: string
        }
        Insert: {
          block_off: string
          block_on: string
          charged?: boolean
          charged_at?: string | null
          charged_by?: string | null
          copilot_id?: string | null
          created_at?: string
          fuel?: number | null
          icao_departure?: string | null
          icao_destination?: string | null
          id?: string
          landing_time: string
          landings?: number
          locked?: boolean
          m_and_b_pdf_url?: string | null
          needs_board_review?: boolean
          oil?: number | null
          operation_type_id?: string | null
          passengers?: number | null
          pilot_id: string
          plane_id: string
          takeoff_time: string
          updated_at?: string
        }
        Update: {
          block_off?: string
          block_on?: string
          charged?: boolean
          charged_at?: string | null
          charged_by?: string | null
          copilot_id?: string | null
          created_at?: string
          fuel?: number | null
          icao_departure?: string | null
          icao_destination?: string | null
          id?: string
          landing_time?: string
          landings?: number
          locked?: boolean
          m_and_b_pdf_url?: string | null
          needs_board_review?: boolean
          oil?: number | null
          operation_type_id?: string | null
          passengers?: number | null
          pilot_id?: string
          plane_id?: string
          takeoff_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flightlog_charged_by_fkey"
            columns: ["charged_by"]
            isOneToOne: false
            referencedRelation: "user_balances"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "flightlog_charged_by_fkey"
            columns: ["charged_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flightlog_copilot_id_fkey"
            columns: ["copilot_id"]
            isOneToOne: false
            referencedRelation: "user_balances"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "flightlog_copilot_id_fkey"
            columns: ["copilot_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flightlog_operation_type_id_fkey"
            columns: ["operation_type_id"]
            isOneToOne: false
            referencedRelation: "operation_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flightlog_pilot_id_fkey"
            columns: ["pilot_id"]
            isOneToOne: false
            referencedRelation: "user_balances"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "flightlog_pilot_id_fkey"
            columns: ["pilot_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flightlog_plane_id_fkey"
            columns: ["plane_id"]
            isOneToOne: false
            referencedRelation: "aircraft_totals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flightlog_plane_id_fkey"
            columns: ["plane_id"]
            isOneToOne: false
            referencedRelation: "aircraft_with_maintenance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flightlog_plane_id_fkey"
            columns: ["plane_id"]
            isOneToOne: false
            referencedRelation: "planes"
            referencedColumns: ["id"]
          },
        ]
      }
      functions_master: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      maintenance_records: {
        Row: {
          cost: number | null
          created_at: string
          description: string | null
          hobbs_hours: number | null
          id: string
          maintenance_type: string
          next_due_hours: number | null
          notes: string | null
          performed_at: string
          performed_at_hours: number
          performed_by: string
          plane_id: string
          tach_hours: number | null
          updated_at: string
          vendor: string | null
        }
        Insert: {
          cost?: number | null
          created_at?: string
          description?: string | null
          hobbs_hours?: number | null
          id?: string
          maintenance_type: string
          next_due_hours?: number | null
          notes?: string | null
          performed_at: string
          performed_at_hours: number
          performed_by: string
          plane_id: string
          tach_hours?: number | null
          updated_at?: string
          vendor?: string | null
        }
        Update: {
          cost?: number | null
          created_at?: string
          description?: string | null
          hobbs_hours?: number | null
          id?: string
          maintenance_type?: string
          next_due_hours?: number | null
          notes?: string | null
          performed_at?: string
          performed_at_hours?: number
          performed_by?: string
          plane_id?: string
          tach_hours?: number | null
          updated_at?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_records_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "user_balances"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "maintenance_records_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_records_plane_id_fkey"
            columns: ["plane_id"]
            isOneToOne: false
            referencedRelation: "aircraft_totals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_records_plane_id_fkey"
            columns: ["plane_id"]
            isOneToOne: false
            referencedRelation: "aircraft_with_maintenance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_records_plane_id_fkey"
            columns: ["plane_id"]
            isOneToOne: false
            referencedRelation: "planes"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          document_id: string | null
          flightlog_id: string | null
          id: string
          link: string | null
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_id?: string | null
          flightlog_id?: string | null
          id?: string
          link?: string | null
          message: string
          read?: boolean
          title?: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_id?: string | null
          flightlog_id?: string | null
          id?: string
          link?: string | null
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "user_documents_with_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_flightlog_id_fkey"
            columns: ["flightlog_id"]
            isOneToOne: false
            referencedRelation: "flightlog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_flightlog_id_fkey"
            columns: ["flightlog_id"]
            isOneToOne: false
            referencedRelation: "flightlog_with_operation_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_flightlog_id_fkey"
            columns: ["flightlog_id"]
            isOneToOne: false
            referencedRelation: "flightlog_with_times"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_flightlog_id_fkey"
            columns: ["flightlog_id"]
            isOneToOne: false
            referencedRelation: "uncharged_flights"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_balances"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      operation_types: {
        Row: {
          color: string | null
          created_at: string | null
          default_cost_center_id: string | null
          description: string | null
          id: string
          is_default: boolean | null
          name: string
          plane_id: string
          rate: number
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          default_cost_center_id?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          plane_id: string
          rate: number
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          default_cost_center_id?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          plane_id?: string
          rate?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operation_types_default_cost_center_id_fkey"
            columns: ["default_cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_types_plane_id_fkey"
            columns: ["plane_id"]
            isOneToOne: false
            referencedRelation: "aircraft_totals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_types_plane_id_fkey"
            columns: ["plane_id"]
            isOneToOne: false
            referencedRelation: "aircraft_with_maintenance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_types_plane_id_fkey"
            columns: ["plane_id"]
            isOneToOne: false
            referencedRelation: "planes"
            referencedColumns: ["id"]
          },
        ]
      }
      planes: {
        Row: {
          active: boolean
          billing_unit: string | null
          cg_limits: Json | null
          color: string | null
          created_at: string
          default_rate: number | null
          emer_equipment: string | null
          empty_weight: number | null
          fuel_consumption: number | null
          hourly_rate: number | null
          id: string
          initial_flight_hours: number
          initial_landings: number
          maintenance_interval_hours: number | null
          max_fuel: number | null
          max_mass: number | null
          nav_equipment: string[] | null
          next_maintenance_hours: number | null
          passenger_seats: number | null
          tail_number: string
          type: string
          updated_at: string
          xdpr_equipment: string | null
        }
        Insert: {
          active?: boolean
          billing_unit?: string | null
          cg_limits?: Json | null
          color?: string | null
          created_at?: string
          default_rate?: number | null
          emer_equipment?: string | null
          empty_weight?: number | null
          fuel_consumption?: number | null
          hourly_rate?: number | null
          id?: string
          initial_flight_hours?: number
          initial_landings?: number
          maintenance_interval_hours?: number | null
          max_fuel?: number | null
          max_mass?: number | null
          nav_equipment?: string[] | null
          next_maintenance_hours?: number | null
          passenger_seats?: number | null
          tail_number: string
          type: string
          updated_at?: string
          xdpr_equipment?: string | null
        }
        Update: {
          active?: boolean
          billing_unit?: string | null
          cg_limits?: Json | null
          color?: string | null
          created_at?: string
          default_rate?: number | null
          emer_equipment?: string | null
          empty_weight?: number | null
          fuel_consumption?: number | null
          hourly_rate?: number | null
          id?: string
          initial_flight_hours?: number
          initial_landings?: number
          maintenance_interval_hours?: number | null
          max_fuel?: number | null
          max_mass?: number | null
          nav_equipment?: string[] | null
          next_maintenance_hours?: number | null
          passenger_seats?: number | null
          tail_number?: string
          type?: string
          updated_at?: string
          xdpr_equipment?: string | null
        }
        Relationships: []
      }
      reservations: {
        Row: {
          created_at: string
          end_time: string
          id: string
          plane_id: string
          priority: boolean
          remarks: string | null
          start_time: string
          status: Database["public"]["Enums"]["reservation_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_time: string
          id?: string
          plane_id: string
          priority?: boolean
          remarks?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["reservation_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_time?: string
          id?: string
          plane_id?: string
          priority?: boolean
          remarks?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["reservation_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_plane_id_fkey"
            columns: ["plane_id"]
            isOneToOne: false
            referencedRelation: "aircraft_totals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_plane_id_fkey"
            columns: ["plane_id"]
            isOneToOne: false
            referencedRelation: "aircraft_with_maintenance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_plane_id_fkey"
            columns: ["plane_id"]
            isOneToOne: false
            referencedRelation: "planes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_balances"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reservations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string
          functions: string[] | null
          id: string
          license_number: string | null
          name: string
          role: string[]
          surname: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          functions?: string[] | null
          id: string
          license_number?: string | null
          name: string
          role?: string[]
          surname: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          functions?: string[] | null
          id?: string
          license_number?: string | null
          name?: string
          role?: string[]
          surname?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      active_reservations: {
        Row: {
          created_at: string | null
          duration_hours: number | null
          end_time: string | null
          id: string | null
          plane_color: string | null
          plane_id: string | null
          plane_type: string | null
          priority: boolean | null
          remarks: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["reservation_status"] | null
          tail_number: string | null
          updated_at: string | null
          user_email: string | null
          user_id: string | null
          user_name: string | null
          user_surname: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservations_plane_id_fkey"
            columns: ["plane_id"]
            isOneToOne: false
            referencedRelation: "aircraft_totals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_plane_id_fkey"
            columns: ["plane_id"]
            isOneToOne: false
            referencedRelation: "aircraft_with_maintenance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_plane_id_fkey"
            columns: ["plane_id"]
            isOneToOne: false
            referencedRelation: "planes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_balances"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reservations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      aircraft_components_with_status: {
        Row: {
          aircraft_current_hours: number | null
          component_current_hours: number | null
          component_hours_offset: number | null
          component_type: Database["public"]["Enums"]["component_type"] | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          created_by_surname: string | null
          hours_at_installation: number | null
          hours_remaining: number | null
          id: string | null
          installation_mx_record_id: string | null
          installed_at: string | null
          installed_by: string | null
          installed_by_name: string | null
          installed_by_surname: string | null
          manufacturer: string | null
          model: string | null
          notes: string | null
          part_number: string | null
          percentage_used: number | null
          plane_id: string | null
          position: string | null
          removal_mx_record_id: string | null
          removal_reason: string | null
          removed_at: string | null
          removed_by: string | null
          removed_by_name: string | null
          removed_by_surname: string | null
          serial_number: string | null
          status: Database["public"]["Enums"]["component_status"] | null
          tail_number: string | null
          tbo_hours: number | null
          tbo_status: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aircraft_components_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_balances"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "aircraft_components_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aircraft_components_installation_mx_record_id_fkey"
            columns: ["installation_mx_record_id"]
            isOneToOne: false
            referencedRelation: "maintenance_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aircraft_components_installed_by_fkey"
            columns: ["installed_by"]
            isOneToOne: false
            referencedRelation: "user_balances"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "aircraft_components_installed_by_fkey"
            columns: ["installed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aircraft_components_plane_id_fkey"
            columns: ["plane_id"]
            isOneToOne: false
            referencedRelation: "aircraft_totals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aircraft_components_plane_id_fkey"
            columns: ["plane_id"]
            isOneToOne: false
            referencedRelation: "aircraft_with_maintenance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aircraft_components_plane_id_fkey"
            columns: ["plane_id"]
            isOneToOne: false
            referencedRelation: "planes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aircraft_components_removal_mx_record_id_fkey"
            columns: ["removal_mx_record_id"]
            isOneToOne: false
            referencedRelation: "maintenance_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aircraft_components_removed_by_fkey"
            columns: ["removed_by"]
            isOneToOne: false
            referencedRelation: "user_balances"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "aircraft_components_removed_by_fkey"
            columns: ["removed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      aircraft_totals: {
        Row: {
          active: boolean | null
          id: string | null
          initial_flight_hours: number | null
          initial_landings: number | null
          logged_flight_hours: number | null
          logged_landings: number | null
          tail_number: string | null
          total_flight_hours: number | null
          total_landings: number | null
          type: string | null
        }
        Relationships: []
      }
      aircraft_with_maintenance: {
        Row: {
          active: boolean | null
          color: string | null
          hours_until_maintenance: number | null
          id: string | null
          initial_flight_hours: number | null
          initial_landings: number | null
          last_maintenance: Json | null
          logged_flight_hours: number | null
          logged_landings: number | null
          maintenance_interval_hours: number | null
          maintenance_status: string | null
          next_maintenance_hours: number | null
          tail_number: string | null
          total_flight_hours: number | null
          total_landings: number | null
          type: string | null
        }
        Relationships: []
      }
      flightlog_with_operation_details: {
        Row: {
          billing_unit: string | null
          block_off: string | null
          block_on: string | null
          block_time_hours: number | null
          block_time_minutes: number | null
          calculated_billing_amount: number | null
          charged: boolean | null
          copilot_id: string | null
          copilot_name: string | null
          copilot_surname: string | null
          created_at: string | null
          flight_time_hours: number | null
          flight_time_minutes: number | null
          fuel: number | null
          id: string | null
          landing_time: string | null
          locked: boolean | null
          m_and_b_pdf_url: string | null
          needs_board_review: boolean | null
          oil: number | null
          operation_rate: number | null
          operation_type_id: string | null
          operation_type_name: string | null
          pilot_id: string | null
          pilot_name: string | null
          pilot_surname: string | null
          plane_id: string | null
          plane_type: string | null
          tail_number: string | null
          takeoff_time: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flightlog_copilot_id_fkey"
            columns: ["copilot_id"]
            isOneToOne: false
            referencedRelation: "user_balances"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "flightlog_copilot_id_fkey"
            columns: ["copilot_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flightlog_operation_type_id_fkey"
            columns: ["operation_type_id"]
            isOneToOne: false
            referencedRelation: "operation_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flightlog_pilot_id_fkey"
            columns: ["pilot_id"]
            isOneToOne: false
            referencedRelation: "user_balances"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "flightlog_pilot_id_fkey"
            columns: ["pilot_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flightlog_plane_id_fkey"
            columns: ["plane_id"]
            isOneToOne: false
            referencedRelation: "aircraft_totals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flightlog_plane_id_fkey"
            columns: ["plane_id"]
            isOneToOne: false
            referencedRelation: "aircraft_with_maintenance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flightlog_plane_id_fkey"
            columns: ["plane_id"]
            isOneToOne: false
            referencedRelation: "planes"
            referencedColumns: ["id"]
          },
        ]
      }
      flightlog_with_times: {
        Row: {
          billing_unit: string | null
          block_off: string | null
          block_on: string | null
          block_time_hours: number | null
          charged: boolean | null
          copilot_id: string | null
          copilot_name: string | null
          copilot_surname: string | null
          created_at: string | null
          flight_time_hours: number | null
          fuel: number | null
          icao_departure: string | null
          icao_destination: string | null
          id: string | null
          landing_time: string | null
          landings: number | null
          locked: boolean | null
          m_and_b_pdf_url: string | null
          needs_board_review: boolean | null
          oil: number | null
          operation_rate: number | null
          operation_type_color: string | null
          operation_type_id: string | null
          operation_type_name: string | null
          pilot_id: string | null
          pilot_name: string | null
          pilot_surname: string | null
          plane_id: string | null
          plane_type: string | null
          tail_number: string | null
          takeoff_time: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flightlog_copilot_id_fkey"
            columns: ["copilot_id"]
            isOneToOne: false
            referencedRelation: "user_balances"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "flightlog_copilot_id_fkey"
            columns: ["copilot_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flightlog_operation_type_id_fkey"
            columns: ["operation_type_id"]
            isOneToOne: false
            referencedRelation: "operation_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flightlog_pilot_id_fkey"
            columns: ["pilot_id"]
            isOneToOne: false
            referencedRelation: "user_balances"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "flightlog_pilot_id_fkey"
            columns: ["pilot_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flightlog_plane_id_fkey"
            columns: ["plane_id"]
            isOneToOne: false
            referencedRelation: "aircraft_totals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flightlog_plane_id_fkey"
            columns: ["plane_id"]
            isOneToOne: false
            referencedRelation: "aircraft_with_maintenance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flightlog_plane_id_fkey"
            columns: ["plane_id"]
            isOneToOne: false
            referencedRelation: "planes"
            referencedColumns: ["id"]
          },
        ]
      }
      uncharged_flights: {
        Row: {
          airport_fees: number | null
          billing_unit: string | null
          block_off: string | null
          block_on: string | null
          block_time_hours: number | null
          calculated_amount: number | null
          charged: boolean | null
          copilot_id: string | null
          copilot_name: string | null
          copilot_surname: string | null
          created_at: string | null
          default_cost_center_id: string | null
          default_cost_center_name: string | null
          flight_amount: number | null
          flight_time_hours: number | null
          fuel: number | null
          icao_departure: string | null
          icao_destination: string | null
          id: string | null
          landing_time: string | null
          landings: number | null
          locked: boolean | null
          m_and_b_pdf_url: string | null
          oil: number | null
          operation_rate: number | null
          operation_type_id: string | null
          operation_type_name: string | null
          passenger_seats: number | null
          passengers: number | null
          pilot_email: string | null
          pilot_id: string | null
          pilot_name: string | null
          pilot_surname: string | null
          plane_default_rate: number | null
          plane_id: string | null
          plane_type: string | null
          tail_number: string | null
          takeoff_time: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flightlog_copilot_id_fkey"
            columns: ["copilot_id"]
            isOneToOne: false
            referencedRelation: "user_balances"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "flightlog_copilot_id_fkey"
            columns: ["copilot_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flightlog_operation_type_id_fkey"
            columns: ["operation_type_id"]
            isOneToOne: false
            referencedRelation: "operation_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flightlog_pilot_id_fkey"
            columns: ["pilot_id"]
            isOneToOne: false
            referencedRelation: "user_balances"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "flightlog_pilot_id_fkey"
            columns: ["pilot_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flightlog_plane_id_fkey"
            columns: ["plane_id"]
            isOneToOne: false
            referencedRelation: "aircraft_totals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flightlog_plane_id_fkey"
            columns: ["plane_id"]
            isOneToOne: false
            referencedRelation: "aircraft_with_maintenance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flightlog_plane_id_fkey"
            columns: ["plane_id"]
            isOneToOne: false
            referencedRelation: "planes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_types_default_cost_center_id_fkey"
            columns: ["default_cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_balances: {
        Row: {
          balance: number | null
          email: string | null
          name: string | null
          surname: string | null
          transaction_count: number | null
          user_id: string | null
        }
        Relationships: []
      }
      user_documents_with_types: {
        Row: {
          approved: boolean | null
          approved_at: string | null
          approved_by: string | null
          approver_name: string | null
          approver_surname: string | null
          blocks_aircraft: boolean | null
          category: string | null
          document_type_expires: boolean | null
          document_type_expiry_type: string | null
          document_type_id: string | null
          document_type_mandatory: boolean | null
          document_type_name: string | null
          document_type_required_for_functions: string[] | null
          expiry_date: string | null
          file_url: string | null
          id: string | null
          name: string | null
          plane_id: string | null
          tags: string[] | null
          uploaded_at: string | null
          uploaded_by: string | null
          uploader_name: string | null
          uploader_surname: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_balances"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "documents_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_document_type_id_fkey"
            columns: ["document_type_id"]
            isOneToOne: false
            referencedRelation: "document_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_plane_id_fkey"
            columns: ["plane_id"]
            isOneToOne: false
            referencedRelation: "aircraft_totals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_plane_id_fkey"
            columns: ["plane_id"]
            isOneToOne: false
            referencedRelation: "aircraft_with_maintenance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_plane_id_fkey"
            columns: ["plane_id"]
            isOneToOne: false
            referencedRelation: "planes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "user_balances"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_balances"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      calculate_block_time: {
        Args: { p_block_off: string; p_block_on: string }
        Returns: number
      }
      calculate_flight_time: {
        Args: { p_landing_time: string; p_takeoff_time: string }
        Returns: number
      }
      can_reserve_aircraft: { Args: { p_plane_id: string }; Returns: boolean }
      is_board_member: { Args: { user_uuid: string }; Returns: boolean }
    }
    Enums: {
      component_status: "active" | "removed" | "overhauled" | "scrapped"
      component_type:
        | "engine"
        | "propeller"
        | "landing_gear"
        | "constant_speed_unit"
        | "magneto"
        | "vacuum_pump"
        | "alternator"
        | "starter"
        | "other"
      reservation_status: "active" | "standby" | "cancelled"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      component_status: ["active", "removed", "overhauled", "scrapped"],
      component_type: [
        "engine",
        "propeller",
        "landing_gear",
        "constant_speed_unit",
        "magneto",
        "vacuum_pump",
        "alternator",
        "starter",
        "other",
      ],
      reservation_status: ["active", "standby", "cancelled"],
    },
  },
} as const
A new version of Supabase CLI is available: v2.54.11 (currently installed v2.20.5)
We recommend updating regularly for new features and bug fixes: https://supabase.com/docs/guides/cli/getting-started#updating-the-supabase-cli
