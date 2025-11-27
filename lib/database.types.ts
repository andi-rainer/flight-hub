export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
            foreignKeyName: "accounts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions_search"
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
            foreignKeyName: "accounts_reversed_by_fkey"
            columns: ["reversed_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_reversed_by_fkey"
            columns: ["reversed_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions_search"
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
          {
            foreignKeyName: "accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_functions_search"
            referencedColumns: ["id"]
          },
        ]
      }
      aircraft_airport_fees: {
        Row: {
          airport_id: string
          approach_fee: number | null
          created_at: string | null
          id: string
          landing_fee: number | null
          noise_fee: number | null
          notes: string | null
          parking_fee: number | null
          passenger_fee: number | null
          plane_id: string
          updated_at: string | null
        }
        Insert: {
          airport_id: string
          approach_fee?: number | null
          created_at?: string | null
          id?: string
          landing_fee?: number | null
          noise_fee?: number | null
          notes?: string | null
          parking_fee?: number | null
          passenger_fee?: number | null
          plane_id: string
          updated_at?: string | null
        }
        Update: {
          airport_id?: string
          approach_fee?: number | null
          created_at?: string | null
          id?: string
          landing_fee?: number | null
          noise_fee?: number | null
          notes?: string | null
          parking_fee?: number | null
          passenger_fee?: number | null
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
      aircraft_cg_limits: {
        Row: {
          arm: number
          created_at: string
          id: string
          limit_type: string
          notes: string | null
          plane_id: string
          sort_order: number
          updated_at: string
          weight: number
        }
        Insert: {
          arm: number
          created_at?: string
          id?: string
          limit_type: string
          notes?: string | null
          plane_id: string
          sort_order?: number
          updated_at?: string
          weight: number
        }
        Update: {
          arm?: number
          created_at?: string
          id?: string
          limit_type?: string
          notes?: string | null
          plane_id?: string
          sort_order?: number
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "aircraft_cg_limits_plane_id_fkey"
            columns: ["plane_id"]
            isOneToOne: false
            referencedRelation: "aircraft_totals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aircraft_cg_limits_plane_id_fkey"
            columns: ["plane_id"]
            isOneToOne: false
            referencedRelation: "aircraft_with_maintenance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aircraft_cg_limits_plane_id_fkey"
            columns: ["plane_id"]
            isOneToOne: false
            referencedRelation: "planes"
            referencedColumns: ["id"]
          },
        ]
      }
      aircraft_components: {
        Row: {
          component_hours_offset: number | null
          component_type: Database["public"]["Enums"]["component_type"]
          created_at: string | null
          created_by: string
          hours_at_installation: number | null
          id: string
          installation_mx_record_id: string | null
          installed_at: string | null
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
          status: Database["public"]["Enums"]["component_status"] | null
          tbo_hours: number
          updated_at: string | null
        }
        Insert: {
          component_hours_offset?: number | null
          component_type: Database["public"]["Enums"]["component_type"]
          created_at?: string | null
          created_by: string
          hours_at_installation?: number | null
          id?: string
          installation_mx_record_id?: string | null
          installed_at?: string | null
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
          status?: Database["public"]["Enums"]["component_status"] | null
          tbo_hours: number
          updated_at?: string | null
        }
        Update: {
          component_hours_offset?: number | null
          component_type?: Database["public"]["Enums"]["component_type"]
          created_at?: string | null
          created_by?: string
          hours_at_installation?: number | null
          id?: string
          installation_mx_record_id?: string | null
          installed_at?: string | null
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
          status?: Database["public"]["Enums"]["component_status"] | null
          tbo_hours?: number
          updated_at?: string | null
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
            foreignKeyName: "aircraft_components_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aircraft_components_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions_search"
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
            foreignKeyName: "aircraft_components_installed_by_fkey"
            columns: ["installed_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aircraft_components_installed_by_fkey"
            columns: ["installed_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions_search"
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
          {
            foreignKeyName: "aircraft_components_removed_by_fkey"
            columns: ["removed_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aircraft_components_removed_by_fkey"
            columns: ["removed_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions_search"
            referencedColumns: ["id"]
          },
        ]
      }
      aircraft_stations: {
        Row: {
          active: boolean
          arm: number
          basic_weight: number
          created_at: string
          id: string
          name: string
          notes: string | null
          plane_id: string
          sort_order: number
          station_type: string
          updated_at: string
          weight_limit: number
        }
        Insert: {
          active?: boolean
          arm: number
          basic_weight?: number
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          plane_id: string
          sort_order?: number
          station_type: string
          updated_at?: string
          weight_limit: number
        }
        Update: {
          active?: boolean
          arm?: number
          basic_weight?: number
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          plane_id?: string
          sort_order?: number
          station_type?: string
          updated_at?: string
          weight_limit?: number
        }
        Relationships: [
          {
            foreignKeyName: "aircraft_stations_plane_id_fkey"
            columns: ["plane_id"]
            isOneToOne: false
            referencedRelation: "aircraft_totals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aircraft_stations_plane_id_fkey"
            columns: ["plane_id"]
            isOneToOne: false
            referencedRelation: "aircraft_with_maintenance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aircraft_stations_plane_id_fkey"
            columns: ["plane_id"]
            isOneToOne: false
            referencedRelation: "planes"
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
      api_keys: {
        Row: {
          active: boolean | null
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          key_hash: string
          last_used_at: string | null
          name: string
          permissions: string[] | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          key_hash: string
          last_used_at?: string | null
          name: string
          permissions?: string[] | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          key_hash?: string
          last_used_at?: string | null
          name?: string
          permissions?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_balances"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "api_keys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_keys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_keys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions_search"
            referencedColumns: ["id"]
          },
        ]
      }
      board_contact_settings: {
        Row: {
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          id: string
          office_hours: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          office_hours?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          office_hours?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "board_contact_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_balances"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "board_contact_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_contact_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_contact_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions_search"
            referencedColumns: ["id"]
          },
        ]
      }
      category_endorsements: {
        Row: {
          category_id: string
          created_at: string | null
          created_by: string | null
          endorsement_id: string
          id: string
        }
        Insert: {
          category_id: string
          created_at?: string | null
          created_by?: string | null
          endorsement_id: string
          id?: string
        }
        Update: {
          category_id?: string
          created_at?: string | null
          created_by?: string | null
          endorsement_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_endorsements_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "document_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_endorsements_endorsement_id_fkey"
            columns: ["endorsement_id"]
            isOneToOne: false
            referencedRelation: "endorsements"
            referencedColumns: ["id"]
          },
        ]
      }
      component_tbo_presets: {
        Row: {
          component_type: Database["public"]["Enums"]["component_type"]
          created_at: string | null
          default_tbo_hours: number
          description: string | null
          id: string
          is_common: boolean | null
          manufacturer: string | null
          model: string | null
          notes: string | null
          part_number: string | null
          updated_at: string | null
        }
        Insert: {
          component_type: Database["public"]["Enums"]["component_type"]
          created_at?: string | null
          default_tbo_hours: number
          description?: string | null
          id?: string
          is_common?: boolean | null
          manufacturer?: string | null
          model?: string | null
          notes?: string | null
          part_number?: string | null
          updated_at?: string | null
        }
        Update: {
          component_type?: Database["public"]["Enums"]["component_type"]
          created_at?: string | null
          default_tbo_hours?: number
          description?: string | null
          id?: string
          is_common?: boolean | null
          manufacturer?: string | null
          model?: string | null
          notes?: string | null
          part_number?: string | null
          updated_at?: string | null
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
            foreignKeyName: "cost_center_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_center_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions_search"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_center_transactions_flightlog_id_fkey"
            columns: ["flightlog_id"]
            isOneToOne: false
            referencedRelation: "flightlog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_center_transactions_flightlog_id_fkey"
            columns: ["flightlog_id"]
            isOneToOne: false
            referencedRelation: "flightlog_with_operation_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_center_transactions_flightlog_id_fkey"
            columns: ["flightlog_id"]
            isOneToOne: false
            referencedRelation: "flightlog_with_times"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_center_transactions_flightlog_id_fkey"
            columns: ["flightlog_id"]
            isOneToOne: false
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
            foreignKeyName: "cost_center_transactions_reversed_by_fkey"
            columns: ["reversed_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_center_transactions_reversed_by_fkey"
            columns: ["reversed_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions_search"
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
      definition_endorsements: {
        Row: {
          created_at: string | null
          created_by: string | null
          document_definition_id: string
          endorsement_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          document_definition_id: string
          endorsement_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          document_definition_id?: string
          endorsement_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "definition_endorsements_document_definition_id_fkey"
            columns: ["document_definition_id"]
            isOneToOne: false
            referencedRelation: "document_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "definition_endorsements_endorsement_id_fkey"
            columns: ["endorsement_id"]
            isOneToOne: false
            referencedRelation: "endorsements"
            referencedColumns: ["id"]
          },
        ]
      }
      document_categories: {
        Row: {
          active: boolean | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
          sort_order: number
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          sort_order?: number
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      document_definitions: {
        Row: {
          active: boolean | null
          created_at: string | null
          description: string | null
          expires: boolean | null
          has_endorsements: boolean | null
          has_subcategories: boolean | null
          icon: string | null
          id: string
          mandatory: boolean | null
          name: string
          required_for_functions: string[] | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          expires?: boolean | null
          has_endorsements?: boolean | null
          has_subcategories?: boolean | null
          icon?: string | null
          id?: string
          mandatory?: boolean | null
          name: string
          required_for_functions?: string[] | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          expires?: boolean | null
          has_endorsements?: boolean | null
          has_subcategories?: boolean | null
          icon?: string | null
          id?: string
          mandatory?: boolean | null
          name?: string
          required_for_functions?: string[] | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      document_endorsement_privileges: {
        Row: {
          added_by: string
          created_at: string
          document_id: string
          endorsement_id: string
          expiry_date: string | null
          has_ir: boolean
          id: string
          ir_expiry_date: string | null
          notes: string | null
          updated_at: string
        }
        Insert: {
          added_by: string
          created_at?: string
          document_id: string
          endorsement_id: string
          expiry_date?: string | null
          has_ir?: boolean
          id?: string
          ir_expiry_date?: string | null
          notes?: string | null
          updated_at?: string
        }
        Update: {
          added_by?: string
          created_at?: string
          document_id?: string
          endorsement_id?: string
          expiry_date?: string | null
          has_ir?: boolean
          id?: string
          ir_expiry_date?: string | null
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_endorsement_privileges_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "user_balances"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "document_endorsement_privileges_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_endorsement_privileges_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_endorsement_privileges_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions_search"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_endorsement_privileges_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_endorsement_privileges_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "user_documents_with_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_endorsement_privileges_endorsement_id_fkey"
            columns: ["endorsement_id"]
            isOneToOne: false
            referencedRelation: "endorsements"
            referencedColumns: ["id"]
          },
        ]
      }
      document_subcategories: {
        Row: {
          active: boolean | null
          category_id: string
          code: string | null
          created_at: string | null
          description: string | null
          document_definition_id: string | null
          id: string
          name: string
          sort_order: number
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          category_id: string
          code?: string | null
          created_at?: string | null
          description?: string | null
          document_definition_id?: string | null
          id?: string
          name: string
          sort_order?: number
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          category_id?: string
          code?: string | null
          created_at?: string | null
          description?: string | null
          document_definition_id?: string | null
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "document_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_subcategories_document_definition_id_fkey"
            columns: ["document_definition_id"]
            isOneToOne: false
            referencedRelation: "document_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      document_type_endorsements: {
        Row: {
          created_at: string
          document_type_id: string
          endorsement_id: string
          id: string
          is_required: boolean
        }
        Insert: {
          created_at?: string
          document_type_id: string
          endorsement_id: string
          id?: string
          is_required?: boolean
        }
        Update: {
          created_at?: string
          document_type_id?: string
          endorsement_id?: string
          id?: string
          is_required?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "document_type_endorsements_document_type_id_fkey"
            columns: ["document_type_id"]
            isOneToOne: false
            referencedRelation: "document_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_type_endorsements_endorsement_id_fkey"
            columns: ["endorsement_id"]
            isOneToOne: false
            referencedRelation: "endorsements"
            referencedColumns: ["id"]
          },
        ]
      }
      document_types: {
        Row: {
          category: string | null
          category_id: string | null
          created_at: string
          description: string | null
          expires: boolean
          id: string
          mandatory: boolean
          name: string
          required_for_functions: string[] | null
          subcategory_id: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          expires?: boolean
          id?: string
          mandatory?: boolean
          name: string
          required_for_functions?: string[] | null
          subcategory_id?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          expires?: boolean
          id?: string
          mandatory?: boolean
          name?: string
          required_for_functions?: string[] | null
          subcategory_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_types_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "document_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_types_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "document_subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          approved: boolean
          approved_at: string | null
          approved_by: string | null
          blocks_aircraft: boolean
          category: string | null
          document_definition_id: string | null
          document_type_id: string | null
          expiry_date: string | null
          file_url: string
          id: string
          name: string
          plane_id: string | null
          subcategory_id: string | null
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
          document_definition_id?: string | null
          document_type_id?: string | null
          expiry_date?: string | null
          file_url: string
          id?: string
          name: string
          plane_id?: string | null
          subcategory_id?: string | null
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
          document_definition_id?: string | null
          document_type_id?: string | null
          expiry_date?: string | null
          file_url?: string
          id?: string
          name?: string
          plane_id?: string | null
          subcategory_id?: string | null
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
            foreignKeyName: "documents_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions_search"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_document_definition_id_fkey"
            columns: ["document_definition_id"]
            isOneToOne: false
            referencedRelation: "document_definitions"
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
            foreignKeyName: "documents_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "document_subcategories"
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
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions_search"
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
          {
            foreignKeyName: "documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_functions_search"
            referencedColumns: ["id"]
          },
        ]
      }
      endorsements: {
        Row: {
          active: boolean
          code: string
          created_at: string
          description: string | null
          id: string
          is_predefined: boolean
          name: string
          name_de: string | null
          supports_ir: boolean
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_predefined?: boolean
          name: string
          name_de?: string | null
          supports_ir?: boolean
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_predefined?: boolean
          name?: string
          name_de?: string | null
          supports_ir?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      flightlog: {
        Row: {
          block_off: string
          block_on: string
          charged: boolean
          charged_at: string | null
          charged_by: string | null
          copilot_id: string | null
          copilot_is_instructor: boolean
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
          notes: string | null
          oil: number | null
          operation_type_id: string | null
          passengers: number | null
          pilot_cost_percentage: number
          pilot_id: string
          plane_id: string
          split_cost_with_copilot: boolean
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
          copilot_is_instructor?: boolean
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
          notes?: string | null
          oil?: number | null
          operation_type_id?: string | null
          passengers?: number | null
          pilot_cost_percentage?: number
          pilot_id: string
          plane_id: string
          split_cost_with_copilot?: boolean
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
          copilot_is_instructor?: boolean
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
          notes?: string | null
          oil?: number | null
          operation_type_id?: string | null
          passengers?: number | null
          pilot_cost_percentage?: number
          pilot_id?: string
          plane_id?: string
          split_cost_with_copilot?: boolean
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
            foreignKeyName: "flightlog_charged_by_fkey"
            columns: ["charged_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flightlog_charged_by_fkey"
            columns: ["charged_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions_search"
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
            foreignKeyName: "flightlog_copilot_id_fkey"
            columns: ["copilot_id"]
            isOneToOne: false
            referencedRelation: "users_with_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flightlog_copilot_id_fkey"
            columns: ["copilot_id"]
            isOneToOne: false
            referencedRelation: "users_with_functions_search"
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
            foreignKeyName: "flightlog_pilot_id_fkey"
            columns: ["pilot_id"]
            isOneToOne: false
            referencedRelation: "users_with_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flightlog_pilot_id_fkey"
            columns: ["pilot_id"]
            isOneToOne: false
            referencedRelation: "users_with_functions_search"
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
      function_categories: {
        Row: {
          code: string
          created_at: string
          description_de: string | null
          description_en: string | null
          id: string
          name_de: string
          name_en: string
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          description_de?: string | null
          description_en?: string | null
          id?: string
          name_de: string
          name_en: string
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          description_de?: string | null
          description_en?: string | null
          id?: string
          name_de?: string
          name_en?: string
          sort_order?: number
        }
        Relationships: []
      }
      functions_master: {
        Row: {
          active: boolean
          category_id: string | null
          code: string | null
          created_at: string
          description: string | null
          description_de: string | null
          id: string
          is_system: boolean
          name: string
          name_de: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          category_id?: string | null
          code?: string | null
          created_at?: string
          description?: string | null
          description_de?: string | null
          id?: string
          is_system?: boolean
          name: string
          name_de?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          category_id?: string | null
          code?: string | null
          created_at?: string
          description?: string | null
          description_de?: string | null
          id?: string
          is_system?: boolean
          name?: string
          name_de?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "functions_master_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "function_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_records: {
        Row: {
          cost: number | null
          created_at: string | null
          description: string | null
          hobbs_hours: number | null
          id: string
          maintenance_type: string
          next_due_hours: number | null
          notes: string | null
          performed_at: string
          performed_at_hours: number | null
          performed_by: string | null
          plane_id: string
          tach_hours: number | null
          updated_at: string | null
          vendor: string | null
        }
        Insert: {
          cost?: number | null
          created_at?: string | null
          description?: string | null
          hobbs_hours?: number | null
          id?: string
          maintenance_type: string
          next_due_hours?: number | null
          notes?: string | null
          performed_at: string
          performed_at_hours?: number | null
          performed_by?: string | null
          plane_id: string
          tach_hours?: number | null
          updated_at?: string | null
          vendor?: string | null
        }
        Update: {
          cost?: number | null
          created_at?: string | null
          description?: string | null
          hobbs_hours?: number | null
          id?: string
          maintenance_type?: string
          next_due_hours?: number | null
          notes?: string | null
          performed_at?: string
          performed_at_hours?: number | null
          performed_by?: string | null
          plane_id?: string
          tach_hours?: number | null
          updated_at?: string | null
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
            foreignKeyName: "maintenance_records_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_records_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions_search"
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
      manifest_booking_timeframes: {
        Row: {
          active: boolean | null
          created_at: string | null
          created_by: string | null
          current_bookings: number | null
          end_time: string
          id: string
          max_bookings: number | null
          operation_day_id: string | null
          overbooking_allowed: number | null
          start_time: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          created_by?: string | null
          current_bookings?: number | null
          end_time: string
          id?: string
          max_bookings?: number | null
          operation_day_id?: string | null
          overbooking_allowed?: number | null
          start_time: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          created_by?: string | null
          current_bookings?: number | null
          end_time?: string
          id?: string
          max_bookings?: number | null
          operation_day_id?: string | null
          overbooking_allowed?: number | null
          start_time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "manifest_booking_timeframes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_balances"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "manifest_booking_timeframes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manifest_booking_timeframes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manifest_booking_timeframes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions_search"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manifest_booking_timeframes_operation_day_id_fkey"
            columns: ["operation_day_id"]
            isOneToOne: false
            referencedRelation: "skydive_operation_days"
            referencedColumns: ["id"]
          },
        ]
      }
      manifest_settings: {
        Row: {
          default_flight_interval_minutes: number
          default_jump_altitude_feet: number
          default_operation_end_time: string
          default_operation_start_time: string
          default_tandem_price_eur: number | null
          id: string
          max_jump_altitude_feet: number
          min_jump_altitude_feet: number
          require_payment_before_boarding: boolean | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          default_flight_interval_minutes?: number
          default_jump_altitude_feet?: number
          default_operation_end_time?: string
          default_operation_start_time?: string
          default_tandem_price_eur?: number | null
          id?: string
          max_jump_altitude_feet?: number
          min_jump_altitude_feet?: number
          require_payment_before_boarding?: boolean | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          default_flight_interval_minutes?: number
          default_jump_altitude_feet?: number
          default_operation_end_time?: string
          default_operation_start_time?: string
          default_tandem_price_eur?: number | null
          id?: string
          max_jump_altitude_feet?: number
          min_jump_altitude_feet?: number
          require_payment_before_boarding?: boolean | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "manifest_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_balances"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "manifest_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manifest_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manifest_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions_search"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_types: {
        Row: {
          active: boolean | null
          auto_renew: boolean | null
          created_at: string | null
          currency: string | null
          description: string | null
          duration_unit: string
          duration_value: number
          id: string
          member_category: string | null
          member_number_prefix: string
          name: string
          price: number | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          auto_renew?: boolean | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          duration_unit: string
          duration_value: number
          id?: string
          member_category?: string | null
          member_number_prefix: string
          name: string
          price?: number | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          auto_renew?: boolean | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          duration_unit?: string
          duration_value?: number
          id?: string
          member_category?: string | null
          member_number_prefix?: string
          name?: string
          price?: number | null
          updated_at?: string | null
        }
        Relationships: []
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
          read_at: string | null
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
          read_at?: string | null
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
          read_at?: string | null
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
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_functions_search"
            referencedColumns: ["id"]
          },
        ]
      }
      operation_type_splits: {
        Row: {
          cost_center_id: string | null
          created_at: string
          id: string
          operation_type_id: string
          percentage: number
          sort_order: number
          target_type: string
        }
        Insert: {
          cost_center_id?: string | null
          created_at?: string
          id?: string
          operation_type_id: string
          percentage: number
          sort_order?: number
          target_type: string
        }
        Update: {
          cost_center_id?: string | null
          created_at?: string
          id?: string
          operation_type_id?: string
          percentage?: number
          sort_order?: number
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "operation_type_splits_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_type_splits_operation_type_id_fkey"
            columns: ["operation_type_id"]
            isOneToOne: false
            referencedRelation: "operation_types"
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
      payment_status_history: {
        Row: {
          changed_at: string
          changed_by: string
          id: string
          membership_id: string
          new_status: string
          notes: string | null
          old_status: string
        }
        Insert: {
          changed_at?: string
          changed_by: string
          id?: string
          membership_id: string
          new_status: string
          notes?: string | null
          old_status: string
        }
        Update: {
          changed_at?: string
          changed_by?: string
          id?: string
          membership_id?: string
          new_status?: string
          notes?: string | null
          old_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "user_balances"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "payment_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions_search"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_status_history_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "user_memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      planes: {
        Row: {
          active: boolean
          billing_unit: string | null
          color: string | null
          created_at: string
          default_rate: number | null
          emer_equipment: string | null
          empty_cg: number | null
          empty_weight: number | null
          fuel_consumption: number | null
          id: string
          initial_flight_hours: number | null
          initial_landings: number | null
          is_skydive_aircraft: boolean
          maintenance_interval_hours: number | null
          mass_unit: string
          max_fuel: number | null
          max_jumpers: number | null
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
          color?: string | null
          created_at?: string
          default_rate?: number | null
          emer_equipment?: string | null
          empty_cg?: number | null
          empty_weight?: number | null
          fuel_consumption?: number | null
          id?: string
          initial_flight_hours?: number | null
          initial_landings?: number | null
          is_skydive_aircraft?: boolean
          maintenance_interval_hours?: number | null
          mass_unit?: string
          max_fuel?: number | null
          max_jumpers?: number | null
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
          color?: string | null
          created_at?: string
          default_rate?: number | null
          emer_equipment?: string | null
          empty_cg?: number | null
          empty_weight?: number | null
          fuel_consumption?: number | null
          id?: string
          initial_flight_hours?: number | null
          initial_landings?: number | null
          is_skydive_aircraft?: boolean
          maintenance_interval_hours?: number | null
          mass_unit?: string
          max_fuel?: number | null
          max_jumpers?: number | null
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
          {
            foreignKeyName: "reservations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_functions_search"
            referencedColumns: ["id"]
          },
        ]
      }
      skydive_flight_jumpers: {
        Row: {
          created_at: string
          flight_id: string
          id: string
          jumper_type: string
          notes: string | null
          passenger_id: string | null
          payment_amount: number | null
          payment_received: boolean | null
          payment_type: string | null
          slot_number: number
          slots_occupied: number
          sport_jumper_id: string | null
          tandem_master_id: string | null
          updated_at: string
          voucher_number: string | null
        }
        Insert: {
          created_at?: string
          flight_id: string
          id?: string
          jumper_type: string
          notes?: string | null
          passenger_id?: string | null
          payment_amount?: number | null
          payment_received?: boolean | null
          payment_type?: string | null
          slot_number: number
          slots_occupied?: number
          sport_jumper_id?: string | null
          tandem_master_id?: string | null
          updated_at?: string
          voucher_number?: string | null
        }
        Update: {
          created_at?: string
          flight_id?: string
          id?: string
          jumper_type?: string
          notes?: string | null
          passenger_id?: string | null
          payment_amount?: number | null
          payment_received?: boolean | null
          payment_type?: string | null
          slot_number?: number
          slots_occupied?: number
          sport_jumper_id?: string | null
          tandem_master_id?: string | null
          updated_at?: string
          voucher_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "skydive_flight_jumpers_flight_id_fkey"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "manifest_flights_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skydive_flight_jumpers_flight_id_fkey"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "skydive_flights"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skydive_flight_jumpers_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "user_balances"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "skydive_flight_jumpers_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skydive_flight_jumpers_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "users_with_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skydive_flight_jumpers_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "users_with_functions_search"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skydive_flight_jumpers_sport_jumper_id_fkey"
            columns: ["sport_jumper_id"]
            isOneToOne: false
            referencedRelation: "user_balances"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "skydive_flight_jumpers_sport_jumper_id_fkey"
            columns: ["sport_jumper_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skydive_flight_jumpers_sport_jumper_id_fkey"
            columns: ["sport_jumper_id"]
            isOneToOne: false
            referencedRelation: "users_with_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skydive_flight_jumpers_sport_jumper_id_fkey"
            columns: ["sport_jumper_id"]
            isOneToOne: false
            referencedRelation: "users_with_functions_search"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skydive_flight_jumpers_tandem_master_id_fkey"
            columns: ["tandem_master_id"]
            isOneToOne: false
            referencedRelation: "user_balances"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "skydive_flight_jumpers_tandem_master_id_fkey"
            columns: ["tandem_master_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skydive_flight_jumpers_tandem_master_id_fkey"
            columns: ["tandem_master_id"]
            isOneToOne: false
            referencedRelation: "users_with_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skydive_flight_jumpers_tandem_master_id_fkey"
            columns: ["tandem_master_id"]
            isOneToOne: false
            referencedRelation: "users_with_functions_search"
            referencedColumns: ["id"]
          },
        ]
      }
      skydive_flights: {
        Row: {
          actual_landing: string | null
          actual_takeoff: string | null
          altitude_feet: number | null
          created_at: string
          flight_number: number
          id: string
          notes: string | null
          operation_day_id: string
          pilot_id: string | null
          scheduled_time: string
          status: string
          updated_at: string
        }
        Insert: {
          actual_landing?: string | null
          actual_takeoff?: string | null
          altitude_feet?: number | null
          created_at?: string
          flight_number: number
          id?: string
          notes?: string | null
          operation_day_id: string
          pilot_id?: string | null
          scheduled_time: string
          status?: string
          updated_at?: string
        }
        Update: {
          actual_landing?: string | null
          actual_takeoff?: string | null
          altitude_feet?: number | null
          created_at?: string
          flight_number?: number
          id?: string
          notes?: string | null
          operation_day_id?: string
          pilot_id?: string | null
          scheduled_time?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "skydive_flights_operation_day_id_fkey"
            columns: ["operation_day_id"]
            isOneToOne: false
            referencedRelation: "skydive_operation_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skydive_flights_pilot_id_fkey"
            columns: ["pilot_id"]
            isOneToOne: false
            referencedRelation: "user_balances"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "skydive_flights_pilot_id_fkey"
            columns: ["pilot_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skydive_flights_pilot_id_fkey"
            columns: ["pilot_id"]
            isOneToOne: false
            referencedRelation: "users_with_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skydive_flights_pilot_id_fkey"
            columns: ["pilot_id"]
            isOneToOne: false
            referencedRelation: "users_with_functions_search"
            referencedColumns: ["id"]
          },
        ]
      }
      skydive_operation_days: {
        Row: {
          created_at: string
          created_by: string
          id: string
          notes: string | null
          operation_date: string
          plane_id: string
          reservation_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          notes?: string | null
          operation_date: string
          plane_id: string
          reservation_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          operation_date?: string
          plane_id?: string
          reservation_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "skydive_operation_days_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_balances"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "skydive_operation_days_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skydive_operation_days_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skydive_operation_days_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions_search"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skydive_operation_days_plane_id_fkey"
            columns: ["plane_id"]
            isOneToOne: false
            referencedRelation: "aircraft_totals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skydive_operation_days_plane_id_fkey"
            columns: ["plane_id"]
            isOneToOne: false
            referencedRelation: "aircraft_with_maintenance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skydive_operation_days_plane_id_fkey"
            columns: ["plane_id"]
            isOneToOne: false
            referencedRelation: "planes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skydive_operation_days_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "active_reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skydive_operation_days_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      store_settings: {
        Row: {
          allow_ticket_sales: boolean | null
          allow_voucher_sales: boolean | null
          booking_code_prefix: string | null
          default_max_bookings_per_timeframe: number | null
          default_overbooking_allowed: number | null
          id: string
          redirect_url: string
          stripe_public_key: string | null
          stripe_secret_key: string | null
          updated_at: string | null
          updated_by: string | null
          voucher_code_prefix: string | null
          webhook_secret: string | null
        }
        Insert: {
          allow_ticket_sales?: boolean | null
          allow_voucher_sales?: boolean | null
          booking_code_prefix?: string | null
          default_max_bookings_per_timeframe?: number | null
          default_overbooking_allowed?: number | null
          id?: string
          redirect_url?: string
          stripe_public_key?: string | null
          stripe_secret_key?: string | null
          updated_at?: string | null
          updated_by?: string | null
          voucher_code_prefix?: string | null
          webhook_secret?: string | null
        }
        Update: {
          allow_ticket_sales?: boolean | null
          allow_voucher_sales?: boolean | null
          booking_code_prefix?: string | null
          default_max_bookings_per_timeframe?: number | null
          default_overbooking_allowed?: number | null
          id?: string
          redirect_url?: string
          stripe_public_key?: string | null
          stripe_secret_key?: string | null
          updated_at?: string | null
          updated_by?: string | null
          voucher_code_prefix?: string | null
          webhook_secret?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_balances"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "store_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions_search"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_balances"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "system_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions_search"
            referencedColumns: ["id"]
          },
        ]
      }
      terms_and_conditions: {
        Row: {
          active: boolean | null
          content: string
          created_at: string | null
          created_by: string | null
          effective_date: string
          id: string
          version: string
        }
        Insert: {
          active?: boolean | null
          content: string
          created_at?: string | null
          created_by?: string | null
          effective_date: string
          id?: string
          version: string
        }
        Update: {
          active?: boolean | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          effective_date?: string
          id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "terms_and_conditions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_balances"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "terms_and_conditions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "terms_and_conditions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "terms_and_conditions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions_search"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_bookings: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          assigned_to_flight_jumper_id: string | null
          booking_code: string
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string | null
          id: string
          notes: string | null
          operation_day_id: string | null
          payment_intent_id: string | null
          price_paid_eur: number
          purchase_date: string | null
          purchaser_email: string
          purchaser_name: string
          purchaser_phone: string | null
          status: string | null
          timeframe_id: string | null
          updated_at: string | null
          voucher_type_id: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to_flight_jumper_id?: string | null
          booking_code: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          operation_day_id?: string | null
          payment_intent_id?: string | null
          price_paid_eur: number
          purchase_date?: string | null
          purchaser_email: string
          purchaser_name: string
          purchaser_phone?: string | null
          status?: string | null
          timeframe_id?: string | null
          updated_at?: string | null
          voucher_type_id?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to_flight_jumper_id?: string | null
          booking_code?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          operation_day_id?: string | null
          payment_intent_id?: string | null
          price_paid_eur?: number
          purchase_date?: string | null
          purchaser_email?: string
          purchaser_name?: string
          purchaser_phone?: string | null
          status?: string | null
          timeframe_id?: string | null
          updated_at?: string | null
          voucher_type_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_bookings_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "user_balances"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ticket_bookings_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_bookings_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_bookings_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions_search"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_bookings_assigned_to_flight_jumper_id_fkey"
            columns: ["assigned_to_flight_jumper_id"]
            isOneToOne: false
            referencedRelation: "skydive_flight_jumpers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_bookings_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "user_balances"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ticket_bookings_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_bookings_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_bookings_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions_search"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_bookings_operation_day_id_fkey"
            columns: ["operation_day_id"]
            isOneToOne: false
            referencedRelation: "skydive_operation_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_bookings_timeframe_id_fkey"
            columns: ["timeframe_id"]
            isOneToOne: false
            referencedRelation: "manifest_booking_timeframes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_bookings_voucher_type_id_fkey"
            columns: ["voucher_type_id"]
            isOneToOne: false
            referencedRelation: "voucher_types"
            referencedColumns: ["id"]
          },
        ]
      }
      user_document_endorsements: {
        Row: {
          created_at: string | null
          document_id: string
          endorsement_id: string
          expiry_date: string | null
          has_ir: boolean | null
          id: string
          ir_expiry_date: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          document_id: string
          endorsement_id: string
          expiry_date?: string | null
          has_ir?: boolean | null
          id?: string
          ir_expiry_date?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          document_id?: string
          endorsement_id?: string
          expiry_date?: string | null
          has_ir?: boolean | null
          id?: string
          ir_expiry_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_document_endorsements_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_document_endorsements_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "user_documents_with_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_document_endorsements_endorsement_id_fkey"
            columns: ["endorsement_id"]
            isOneToOne: false
            referencedRelation: "endorsements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_functions: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          function_id: string
          id: string
          notes: string | null
          user_id: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          function_id: string
          id?: string
          notes?: string | null
          user_id: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          function_id?: string
          id?: string
          notes?: string | null
          user_id?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_functions_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "user_balances"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_functions_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_functions_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_functions_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions_search"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_functions_function_id_fkey"
            columns: ["function_id"]
            isOneToOne: false
            referencedRelation: "functions_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_functions_function_id_fkey"
            columns: ["function_id"]
            isOneToOne: false
            referencedRelation: "functions_with_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_functions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_balances"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_functions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_functions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_functions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_functions_search"
            referencedColumns: ["id"]
          },
        ]
      }
      user_memberships: {
        Row: {
          auto_renew: boolean | null
          created_at: string | null
          created_by: string | null
          end_date: string
          id: string
          member_number: string
          membership_type_id: string
          notes: string | null
          payment_status: string | null
          start_date: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_renew?: boolean | null
          created_at?: string | null
          created_by?: string | null
          end_date: string
          id?: string
          member_number: string
          membership_type_id: string
          notes?: string | null
          payment_status?: string | null
          start_date: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_renew?: boolean | null
          created_at?: string | null
          created_by?: string | null
          end_date?: string
          id?: string
          member_number?: string
          membership_type_id?: string
          notes?: string | null
          payment_status?: string | null
          start_date?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_memberships_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_balances"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_memberships_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_memberships_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_memberships_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions_search"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_memberships_membership_type_id_fkey"
            columns: ["membership_type_id"]
            isOneToOne: false
            referencedRelation: "membership_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_balances"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_functions_search"
            referencedColumns: ["id"]
          },
        ]
      }
      user_recent_selections: {
        Row: {
          context: string
          id: string
          selected_at: string | null
          selected_user_id: string
          user_id: string
        }
        Insert: {
          context: string
          id?: string
          selected_at?: string | null
          selected_user_id: string
          user_id: string
        }
        Update: {
          context?: string
          id?: string
          selected_at?: string | null
          selected_user_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_recent_selections_selected_user_id_fkey"
            columns: ["selected_user_id"]
            isOneToOne: false
            referencedRelation: "user_balances"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_recent_selections_selected_user_id_fkey"
            columns: ["selected_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_recent_selections_selected_user_id_fkey"
            columns: ["selected_user_id"]
            isOneToOne: false
            referencedRelation: "users_with_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_recent_selections_selected_user_id_fkey"
            columns: ["selected_user_id"]
            isOneToOne: false
            referencedRelation: "users_with_functions_search"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_recent_selections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_balances"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_recent_selections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_recent_selections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_recent_selections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_functions_search"
            referencedColumns: ["id"]
          },
        ]
      }
      user_terms_acceptance: {
        Row: {
          accepted_at: string | null
          id: string
          ip_address: string | null
          terms_id: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          id?: string
          ip_address?: string | null
          terms_id: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          id?: string
          ip_address?: string | null
          terms_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_terms_acceptance_terms_id_fkey"
            columns: ["terms_id"]
            isOneToOne: false
            referencedRelation: "terms_and_conditions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_terms_acceptance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_balances"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_terms_acceptance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_terms_acceptance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_terms_acceptance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_functions_search"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          birthday: string | null
          city: string | null
          country: string | null
          created_at: string
          email: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          functions: string[] | null
          house_number: string | null
          id: string
          joined_at: string | null
          left_at: string | null
          license_number: string | null
          member_category: string | null
          name: string
          preferred_language: string | null
          role: string[]
          street: string | null
          surname: string
          tandem_jump_completed: boolean | null
          tandem_jump_date: string | null
          telephone: string | null
          updated_at: string
          zip: string | null
        }
        Insert: {
          birthday?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          functions?: string[] | null
          house_number?: string | null
          id: string
          joined_at?: string | null
          left_at?: string | null
          license_number?: string | null
          member_category?: string | null
          name: string
          preferred_language?: string | null
          role?: string[]
          street?: string | null
          surname: string
          tandem_jump_completed?: boolean | null
          tandem_jump_date?: string | null
          telephone?: string | null
          updated_at?: string
          zip?: string | null
        }
        Update: {
          birthday?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          functions?: string[] | null
          house_number?: string | null
          id?: string
          joined_at?: string | null
          left_at?: string | null
          license_number?: string | null
          member_category?: string | null
          name?: string
          preferred_language?: string | null
          role?: string[]
          street?: string | null
          surname?: string
          tandem_jump_completed?: boolean | null
          tandem_jump_date?: string | null
          telephone?: string | null
          updated_at?: string
          zip?: string | null
        }
        Relationships: []
      }
      voucher_types: {
        Row: {
          active: boolean | null
          code: string
          created_at: string | null
          created_by: string | null
          description: string | null
          description_de: string | null
          id: string
          name: string
          name_de: string
          price_eur: number
          sort_order: number | null
          tandem_flight_type: string | null
          updated_at: string | null
          validity_months: number | null
        }
        Insert: {
          active?: boolean | null
          code: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          description_de?: string | null
          id?: string
          name: string
          name_de: string
          price_eur: number
          sort_order?: number | null
          tandem_flight_type?: string | null
          updated_at?: string | null
          validity_months?: number | null
        }
        Update: {
          active?: boolean | null
          code?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          description_de?: string | null
          id?: string
          name?: string
          name_de?: string
          price_eur?: number
          sort_order?: number | null
          tandem_flight_type?: string | null
          updated_at?: string | null
          validity_months?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "voucher_types_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_balances"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "voucher_types_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voucher_types_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voucher_types_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions_search"
            referencedColumns: ["id"]
          },
        ]
      }
      vouchers: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string | null
          id: string
          notes: string | null
          payment_intent_id: string | null
          price_paid_eur: number
          purchase_date: string | null
          purchaser_email: string
          purchaser_name: string
          purchaser_phone: string | null
          redeemed_at: string | null
          redeemed_by: string | null
          redeemed_for_flight_jumper_id: string | null
          redeemed_for_user_id: string | null
          status: string | null
          updated_at: string | null
          valid_from: string | null
          valid_until: string | null
          voucher_code: string
          voucher_type_id: string | null
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_intent_id?: string | null
          price_paid_eur: number
          purchase_date?: string | null
          purchaser_email: string
          purchaser_name: string
          purchaser_phone?: string | null
          redeemed_at?: string | null
          redeemed_by?: string | null
          redeemed_for_flight_jumper_id?: string | null
          redeemed_for_user_id?: string | null
          status?: string | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
          voucher_code: string
          voucher_type_id?: string | null
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_intent_id?: string | null
          price_paid_eur?: number
          purchase_date?: string | null
          purchaser_email?: string
          purchaser_name?: string
          purchaser_phone?: string | null
          redeemed_at?: string | null
          redeemed_by?: string | null
          redeemed_for_flight_jumper_id?: string | null
          redeemed_for_user_id?: string | null
          status?: string | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
          voucher_code?: string
          voucher_type_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vouchers_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "user_balances"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "vouchers_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions_search"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_redeemed_by_fkey"
            columns: ["redeemed_by"]
            isOneToOne: false
            referencedRelation: "user_balances"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "vouchers_redeemed_by_fkey"
            columns: ["redeemed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_redeemed_by_fkey"
            columns: ["redeemed_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_redeemed_by_fkey"
            columns: ["redeemed_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions_search"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_redeemed_for_flight_jumper_id_fkey"
            columns: ["redeemed_for_flight_jumper_id"]
            isOneToOne: false
            referencedRelation: "skydive_flight_jumpers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_redeemed_for_user_id_fkey"
            columns: ["redeemed_for_user_id"]
            isOneToOne: false
            referencedRelation: "user_balances"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "vouchers_redeemed_for_user_id_fkey"
            columns: ["redeemed_for_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_redeemed_for_user_id_fkey"
            columns: ["redeemed_for_user_id"]
            isOneToOne: false
            referencedRelation: "users_with_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_redeemed_for_user_id_fkey"
            columns: ["redeemed_for_user_id"]
            isOneToOne: false
            referencedRelation: "users_with_functions_search"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_voucher_type_id_fkey"
            columns: ["voucher_type_id"]
            isOneToOne: false
            referencedRelation: "voucher_types"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "reservations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_functions_search"
            referencedColumns: ["id"]
          },
        ]
      }
      aircraft_components_with_status: {
        Row: {
          aircraft_total_hours: number | null
          component_current_hours: number | null
          component_hours_offset: number | null
          component_type: Database["public"]["Enums"]["component_type"] | null
          created_at: string | null
          created_by: string | null
          hours_at_installation: number | null
          hours_remaining: number | null
          id: string | null
          installation_mx_record_id: string | null
          installed_at: string | null
          installed_by: string | null
          manufacturer: string | null
          model: string | null
          notes: string | null
          part_number: string | null
          percent_remaining: number | null
          percentage_used: number | null
          plane_id: string | null
          position: string | null
          removal_mx_record_id: string | null
          removal_reason: string | null
          removed_at: string | null
          removed_by: string | null
          serial_number: string | null
          status: Database["public"]["Enums"]["component_status"] | null
          status_color: string | null
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
            foreignKeyName: "aircraft_components_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aircraft_components_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions_search"
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
            foreignKeyName: "aircraft_components_installed_by_fkey"
            columns: ["installed_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aircraft_components_installed_by_fkey"
            columns: ["installed_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions_search"
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
          {
            foreignKeyName: "aircraft_components_removed_by_fkey"
            columns: ["removed_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aircraft_components_removed_by_fkey"
            columns: ["removed_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions_search"
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
          last_flight_date: string | null
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
          billing_unit: string | null
          calculated_next_maintenance_hours: number | null
          color: string | null
          created_at: string | null
          default_rate: number | null
          emer_equipment: string | null
          empty_weight: number | null
          fuel_consumption: number | null
          hours_until_maintenance: number | null
          id: string | null
          initial_flight_hours: number | null
          initial_landings: number | null
          last_flight_date: string | null
          last_maintenance_date: string | null
          last_maintenance_description: string | null
          last_maintenance_type: string | null
          maintenance_interval_hours: number | null
          maintenance_status: string | null
          maintenance_status_color: string | null
          max_fuel: number | null
          max_mass: number | null
          nav_equipment: string[] | null
          next_maintenance_hours: number | null
          passenger_seats: number | null
          tail_number: string | null
          total_flight_hours: number | null
          total_landings: number | null
          type: string | null
          updated_at: string | null
          xdpr_equipment: string | null
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
          charged_at: string | null
          charged_by: string | null
          copilot_id: string | null
          copilot_name: string | null
          copilot_surname: string | null
          created_at: string | null
          default_cost_center_id: string | null
          flight_time_hours: number | null
          flight_time_minutes: number | null
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
          passengers: number | null
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
            foreignKeyName: "flightlog_charged_by_fkey"
            columns: ["charged_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flightlog_charged_by_fkey"
            columns: ["charged_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions_search"
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
            foreignKeyName: "flightlog_copilot_id_fkey"
            columns: ["copilot_id"]
            isOneToOne: false
            referencedRelation: "users_with_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flightlog_copilot_id_fkey"
            columns: ["copilot_id"]
            isOneToOne: false
            referencedRelation: "users_with_functions_search"
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
            foreignKeyName: "flightlog_pilot_id_fkey"
            columns: ["pilot_id"]
            isOneToOne: false
            referencedRelation: "users_with_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flightlog_pilot_id_fkey"
            columns: ["pilot_id"]
            isOneToOne: false
            referencedRelation: "users_with_functions_search"
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
      flightlog_with_times: {
        Row: {
          block_off: string | null
          block_on: string | null
          block_time_hours: number | null
          charged: boolean | null
          charged_at: string | null
          charged_by: string | null
          copilot_id: string | null
          copilot_is_instructor: boolean | null
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
          notes: string | null
          oil: number | null
          operation_type_color: string | null
          operation_type_id: string | null
          operation_type_name: string | null
          passengers: number | null
          pilot_cost_percentage: number | null
          pilot_id: string | null
          pilot_name: string | null
          pilot_surname: string | null
          plane_id: string | null
          plane_type: string | null
          split_cost_with_copilot: boolean | null
          tail_number: string | null
          takeoff_time: string | null
          updated_at: string | null
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
            foreignKeyName: "flightlog_charged_by_fkey"
            columns: ["charged_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flightlog_charged_by_fkey"
            columns: ["charged_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions_search"
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
            foreignKeyName: "flightlog_copilot_id_fkey"
            columns: ["copilot_id"]
            isOneToOne: false
            referencedRelation: "users_with_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flightlog_copilot_id_fkey"
            columns: ["copilot_id"]
            isOneToOne: false
            referencedRelation: "users_with_functions_search"
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
            foreignKeyName: "flightlog_pilot_id_fkey"
            columns: ["pilot_id"]
            isOneToOne: false
            referencedRelation: "users_with_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flightlog_pilot_id_fkey"
            columns: ["pilot_id"]
            isOneToOne: false
            referencedRelation: "users_with_functions_search"
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
      functions_with_stats: {
        Row: {
          active: boolean | null
          active_user_count: number | null
          category_code: string | null
          category_id: string | null
          category_name_de: string | null
          category_name_en: string | null
          code: string | null
          created_at: string | null
          description: string | null
          description_de: string | null
          id: string | null
          is_system: boolean | null
          name: string | null
          name_de: string | null
          sort_order: number | null
          updated_at: string | null
          user_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "functions_master_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "function_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      manifest_flights_with_details: {
        Row: {
          actual_landing: string | null
          actual_takeoff: string | null
          altitude_feet: number | null
          flight_number: number | null
          id: string | null
          notes: string | null
          operation_date: string | null
          operation_day_id: string | null
          pilot_id: string | null
          pilot_name: string | null
          pilot_surname: string | null
          plane_id: string | null
          plane_type: string | null
          scheduled_time: string | null
          sport_jumpers_count: number | null
          status: string | null
          tail_number: string | null
          tandem_pairs_count: number | null
          total_jumpers: number | null
          unpaid_tandems_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "skydive_flights_operation_day_id_fkey"
            columns: ["operation_day_id"]
            isOneToOne: false
            referencedRelation: "skydive_operation_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skydive_flights_pilot_id_fkey"
            columns: ["pilot_id"]
            isOneToOne: false
            referencedRelation: "user_balances"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "skydive_flights_pilot_id_fkey"
            columns: ["pilot_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skydive_flights_pilot_id_fkey"
            columns: ["pilot_id"]
            isOneToOne: false
            referencedRelation: "users_with_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skydive_flights_pilot_id_fkey"
            columns: ["pilot_id"]
            isOneToOne: false
            referencedRelation: "users_with_functions_search"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skydive_operation_days_plane_id_fkey"
            columns: ["plane_id"]
            isOneToOne: false
            referencedRelation: "aircraft_totals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skydive_operation_days_plane_id_fkey"
            columns: ["plane_id"]
            isOneToOne: false
            referencedRelation: "aircraft_with_maintenance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skydive_operation_days_plane_id_fkey"
            columns: ["plane_id"]
            isOneToOne: false
            referencedRelation: "planes"
            referencedColumns: ["id"]
          },
        ]
      }
      uncharged_flights: {
        Row: {
          billing_unit: string | null
          block_off: string | null
          block_on: string | null
          block_time_hours: number | null
          calculated_amount: number | null
          charged: boolean | null
          copilot_id: string | null
          copilot_is_instructor: boolean | null
          copilot_name: string | null
          copilot_surname: string | null
          created_at: string | null
          default_cost_center_id: string | null
          default_cost_center_name: string | null
          departure_airport_name: string | null
          departure_approach_fee: number | null
          departure_landing_fee: number | null
          departure_noise_fee: number | null
          departure_parking_fee: number | null
          departure_passenger_fee: number | null
          departure_total_fees: number | null
          destination_airport_name: string | null
          destination_approach_fee: number | null
          destination_landing_fee: number | null
          destination_noise_fee: number | null
          destination_parking_fee: number | null
          destination_passenger_fee: number | null
          destination_total_fees: number | null
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
          needs_board_review: boolean | null
          notes: string | null
          oil: number | null
          operation_rate: number | null
          operation_type_color: string | null
          operation_type_id: string | null
          operation_type_name: string | null
          passenger_seats: number | null
          passengers: number | null
          pilot_cost_percentage: number | null
          pilot_email: string | null
          pilot_id: string | null
          pilot_name: string | null
          pilot_surname: string | null
          plane_default_rate: number | null
          plane_id: string | null
          plane_type: string | null
          split_cost_with_copilot: boolean | null
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
            foreignKeyName: "flightlog_copilot_id_fkey"
            columns: ["copilot_id"]
            isOneToOne: false
            referencedRelation: "users_with_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flightlog_copilot_id_fkey"
            columns: ["copilot_id"]
            isOneToOne: false
            referencedRelation: "users_with_functions_search"
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
            foreignKeyName: "flightlog_pilot_id_fkey"
            columns: ["pilot_id"]
            isOneToOne: false
            referencedRelation: "users_with_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flightlog_pilot_id_fkey"
            columns: ["pilot_id"]
            isOneToOne: false
            referencedRelation: "users_with_functions_search"
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
          blocks_aircraft: boolean | null
          category: string | null
          document_type_description: string | null
          document_type_expires: boolean | null
          document_type_id: string | null
          document_type_mandatory: boolean | null
          document_type_name: string | null
          expiry_date: string | null
          expiry_status: string | null
          file_url: string | null
          id: string | null
          name: string | null
          plane_id: string | null
          required_for_functions: string[] | null
          tags: string[] | null
          uploaded_at: string | null
          uploaded_by: string | null
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
            foreignKeyName: "documents_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions_search"
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
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users_with_functions_search"
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
          {
            foreignKeyName: "documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_functions_search"
            referencedColumns: ["id"]
          },
        ]
      }
      users_with_functions: {
        Row: {
          created_at: string | null
          email: string | null
          function_codes: string[] | null
          functions: Json | null
          id: string | null
          license_number: string | null
          name: string | null
          role: string[] | null
          surname: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      users_with_functions_search: {
        Row: {
          category_codes: string[] | null
          email: string | null
          function_codes: string[] | null
          function_names: string[] | null
          functions_display: string | null
          id: string | null
          membership_category: string | null
          membership_end_date: string | null
          membership_start_date: string | null
          membership_status: string | null
          name: string | null
          role: string[] | null
          surname: string | null
        }
        Relationships: []
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
      check_timeframe_availability: {
        Args: { timeframe_id: string }
        Returns: {
          available: boolean
          current_bookings: number
          max_bookings: number
          overbooking_allowed: number
          slots_remaining: number
        }[]
      }
      create_notification: {
        Args: {
          p_document_id?: string
          p_flightlog_id?: string
          p_link?: string
          p_message: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      decrement_timeframe_bookings: {
        Args: { timeframe_id: string }
        Returns: boolean
      }
      get_available_pilots: {
        Args: { operation_date: string }
        Returns: {
          email: string
          name: string
          surname: string
          user_id: string
        }[]
      }
      get_available_sport_jumpers: {
        Args: { operation_date: string }
        Returns: {
          email: string
          function_codes: string[]
          name: string
          surname: string
          user_id: string
        }[]
      }
      get_available_tandem_masters: {
        Args: { operation_date: string }
        Returns: {
          email: string
          name: string
          surname: string
          user_id: string
        }[]
      }
      get_available_tandem_passengers: {
        Args: { show_all?: boolean }
        Returns: {
          email: string
          jump_completed: boolean
          member_number: string
          name: string
          surname: string
          user_id: string
        }[]
      }
      get_recent_selections: {
        Args: { p_context: string; p_limit?: number; p_user_id: string }
        Returns: {
          email: string
          function_codes: string[]
          functions_display: string
          name: string
          surname: string
          user_id: string
        }[]
      }
      get_user_endorsement_alerts: {
        Args: { p_user_id: string }
        Returns: {
          endorsement_alerts: Json
          expired_count: number
          expiring_count: number
          ir_expired_count: number
          ir_expiring_count: number
          total_alerts: number
        }[]
      }
      get_user_privilege_alerts: {
        Args: { p_user_id: string }
        Returns: {
          expired_count: number
          expiring_count: number
          privilege_alerts: Json
          total_alerts: number
        }[]
      }
      get_users_by_function: {
        Args: { p_function_codes: string[] }
        Returns: {
          email: string
          function_codes: string[]
          name: string
          surname: string
          user_id: string
        }[]
      }
      has_operation_type_splits: {
        Args: { op_type_id: string }
        Returns: boolean
      }
      has_secretary_function: { Args: { user_id: string }; Returns: boolean }
      increment_timeframe_bookings: {
        Args: { timeframe_id: string }
        Returns: boolean
      }
      is_board_member: { Args: { user_uuid: string }; Returns: boolean }
      is_voucher_valid: { Args: { voucher_id: string }; Returns: boolean }
      mark_flight_completed: {
        Args: { flight_id_param: string }
        Returns: boolean
      }
      refresh_users_with_functions_search: { Args: never; Returns: undefined }
      track_user_selection: {
        Args: {
          p_context: string
          p_selected_user_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      user_has_any_function: {
        Args: { p_function_codes: string[]; p_user_id: string }
        Returns: boolean
      }
      user_has_function: {
        Args: { p_function_code: string; p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      component_status:
        | "active"
        | "installed"
        | "removed"
        | "maintenance"
        | "scrapped"
      component_type:
        | "engine"
        | "propeller"
        | "avionics"
        | "landing_gear"
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
      component_status: [
        "active",
        "installed",
        "removed",
        "maintenance",
        "scrapped",
      ],
      component_type: [
        "engine",
        "propeller",
        "avionics",
        "landing_gear",
        "other",
      ],
      reservation_status: ["active", "standby", "cancelled"],
    },
  },
} as const

