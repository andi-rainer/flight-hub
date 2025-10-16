// This file is generated based on the FlightHub database schema
// Last updated: 2025-01-16

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type ReservationStatus = 'active' | 'standby' | 'cancelled'

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string
          surname: string
          role: string[]
          license_number: string | null
          functions: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name: string
          surname: string
          role?: string[]
          license_number?: string | null
          functions?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          surname?: string
          role?: string[]
          license_number?: string | null
          functions?: string[]
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      functions_master: {
        Row: {
          id: string
          name: string
          yearly_rate: number
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          yearly_rate?: number
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          yearly_rate?: number
          description?: string | null
          created_at?: string
        }
        Relationships: []
      }
      planes: {
        Row: {
          id: string
          tail_number: string
          type: string
          empty_weight: number | null
          max_fuel: number | null
          fuel_consumption: number | null
          color: string | null
          nav_equipment: string[]
          xdpr_equipment: string | null
          emer_equipment: string | null
          max_mass: number | null
          cg_limits: Json | null
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tail_number: string
          type: string
          empty_weight?: number | null
          max_fuel?: number | null
          fuel_consumption?: number | null
          color?: string | null
          nav_equipment?: string[]
          xdpr_equipment?: string | null
          emer_equipment?: string | null
          max_mass?: number | null
          cg_limits?: Json | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tail_number?: string
          type?: string
          empty_weight?: number | null
          max_fuel?: number | null
          fuel_consumption?: number | null
          color?: string | null
          nav_equipment?: string[]
          xdpr_equipment?: string | null
          emer_equipment?: string | null
          max_mass?: number | null
          cg_limits?: Json | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      reservations: {
        Row: {
          id: string
          plane_id: string
          user_id: string
          start_time: string
          end_time: string
          status: ReservationStatus
          priority: boolean
          remarks: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          plane_id: string
          user_id: string
          start_time: string
          end_time: string
          status?: ReservationStatus
          priority?: boolean
          remarks?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          plane_id?: string
          user_id?: string
          start_time?: string
          end_time?: string
          status?: ReservationStatus
          priority?: boolean
          remarks?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
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
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      flightlog: {
        Row: {
          id: string
          plane_id: string
          pilot_id: string
          copilot_id: string | null
          block_on: string
          block_off: string
          takeoff_time: string
          landing_time: string
          fuel: number | null
          oil: number | null
          m_and_b_pdf_url: string | null
          locked: boolean
          charged: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          plane_id: string
          pilot_id: string
          copilot_id?: string | null
          block_on: string
          block_off: string
          takeoff_time: string
          landing_time: string
          fuel?: number | null
          oil?: number | null
          m_and_b_pdf_url?: string | null
          locked?: boolean
          charged?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          plane_id?: string
          pilot_id?: string
          copilot_id?: string | null
          block_on?: string
          block_off?: string
          takeoff_time?: string
          landing_time?: string
          fuel?: number | null
          oil?: number | null
          m_and_b_pdf_url?: string | null
          locked?: boolean
          charged?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flightlog_plane_id_fkey"
            columns: ["plane_id"]
            isOneToOne: false
            referencedRelation: "planes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flightlog_pilot_id_fkey"
            columns: ["pilot_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flightlog_copilot_id_fkey"
            columns: ["copilot_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      documents: {
        Row: {
          id: string
          plane_id: string | null
          user_id: string | null
          category: string | null
          name: string
          file_url: string
          tags: string[]
          uploaded_by: string
          uploaded_at: string
          expiry_date: string | null
          approved: boolean
          blocks_aircraft: boolean
        }
        Insert: {
          id?: string
          plane_id?: string | null
          user_id?: string | null
          category?: string | null
          name: string
          file_url: string
          tags?: string[]
          uploaded_by: string
          uploaded_at?: string
          expiry_date?: string | null
          approved?: boolean
          blocks_aircraft?: boolean
        }
        Update: {
          id?: string
          plane_id?: string | null
          user_id?: string | null
          category?: string | null
          name?: string
          file_url?: string
          tags?: string[]
          uploaded_by?: string
          uploaded_at?: string
          expiry_date?: string | null
          approved?: boolean
          blocks_aircraft?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "documents_plane_id_fkey"
            columns: ["plane_id"]
            isOneToOne: false
            referencedRelation: "planes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      accounts: {
        Row: {
          id: string
          user_id: string
          amount: number
          description: string
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          description: string
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          description?: string
          created_by?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          message: string
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          message: string
          read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          message?: string
          read?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      active_reservations: {
        Row: {
          id: string
          plane_id: string
          user_id: string
          start_time: string
          end_time: string
          status: ReservationStatus
          priority: boolean
          remarks: string | null
          created_at: string
          updated_at: string
          tail_number: string
          plane_type: string
          plane_color: string | null
          user_name: string
          user_surname: string
          user_email: string
          duration_hours: number | null
        }
        Relationships: [
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
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      flightlog_with_times: {
        Row: {
          id: string
          plane_id: string
          pilot_id: string
          copilot_id: string | null
          block_on: string
          block_off: string
          takeoff_time: string
          landing_time: string
          fuel: number | null
          oil: number | null
          m_and_b_pdf_url: string | null
          locked: boolean
          charged: boolean
          created_at: string
          updated_at: string
          block_time_hours: number | null
          flight_time_hours: number | null
          tail_number: string
          plane_type: string
          pilot_name: string
          pilot_surname: string
          copilot_name: string | null
          copilot_surname: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flightlog_plane_id_fkey"
            columns: ["plane_id"]
            isOneToOne: false
            referencedRelation: "planes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flightlog_pilot_id_fkey"
            columns: ["pilot_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flightlog_copilot_id_fkey"
            columns: ["copilot_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      user_balances: {
        Row: {
          user_id: string
          email: string
          name: string
          surname: string
          balance: number | null
          transaction_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      is_board_member: {
        Args: {
          user_uuid: string
        }
        Returns: boolean
      }
      calculate_block_time: {
        Args: {
          p_block_on: string
          p_block_off: string
        }
        Returns: number
      }
      calculate_flight_time: {
        Args: {
          p_takeoff_time: string
          p_landing_time: string
        }
        Returns: number
      }
      can_reserve_aircraft: {
        Args: {
          p_plane_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      reservation_status: ReservationStatus
    }
  }
}

// Convenience types for use in application code
export type User = Database['public']['Tables']['users']['Row']
export type UserInsert = Database['public']['Tables']['users']['Insert']
export type UserUpdate = Database['public']['Tables']['users']['Update']

export type FunctionMaster = Database['public']['Tables']['functions_master']['Row']
export type FunctionMasterInsert = Database['public']['Tables']['functions_master']['Insert']
export type FunctionMasterUpdate = Database['public']['Tables']['functions_master']['Update']

export type Plane = Database['public']['Tables']['planes']['Row']
export type PlaneInsert = Database['public']['Tables']['planes']['Insert']
export type PlaneUpdate = Database['public']['Tables']['planes']['Update']

export type Reservation = Database['public']['Tables']['reservations']['Row']
export type ReservationInsert = Database['public']['Tables']['reservations']['Insert']
export type ReservationUpdate = Database['public']['Tables']['reservations']['Update']

export type Flightlog = Database['public']['Tables']['flightlog']['Row']
export type FlightlogInsert = Database['public']['Tables']['flightlog']['Insert']
export type FlightlogUpdate = Database['public']['Tables']['flightlog']['Update']

export type Document = Database['public']['Tables']['documents']['Row']
export type DocumentInsert = Database['public']['Tables']['documents']['Insert']
export type DocumentUpdate = Database['public']['Tables']['documents']['Update']

export type Account = Database['public']['Tables']['accounts']['Row']
export type AccountInsert = Database['public']['Tables']['accounts']['Insert']
export type AccountUpdate = Database['public']['Tables']['accounts']['Update']

export type Notification = Database['public']['Tables']['notifications']['Row']
export type NotificationInsert = Database['public']['Tables']['notifications']['Insert']
export type NotificationUpdate = Database['public']['Tables']['notifications']['Update']

// View types
export type ActiveReservation = Database['public']['Views']['active_reservations']['Row']
export type FlightlogWithTimes = Database['public']['Views']['flightlog_with_times']['Row']
export type UserBalance = Database['public']['Views']['user_balances']['Row']

// CG Limits structure (for type safety with cg_limits JSONB field)
export interface CGLimits {
  forward: number
  aft: number
  arms: Array<{
    position: number
    moment: number
  }>
}

// Extended types with relations for common queries
export interface PlaneWithDocuments extends Plane {
  documents: Document[]
}

export interface ReservationWithRelations extends Reservation {
  plane: Plane
  user: User
}

export interface FlightlogWithRelations extends Flightlog {
  plane: Plane
  pilot: User
  copilot?: User | null
}

export interface DocumentWithUploader extends Document {
  uploader: User
  plane?: Plane | null
  user?: User | null
}

export interface AccountWithRelations extends Account {
  user: User
  created_by_user: User
}
