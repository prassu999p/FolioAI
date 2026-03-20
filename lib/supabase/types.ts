export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

// Holdings aggregation shape returned by GET /api/holdings
// Declared before Database so it can be referenced in Functions
export interface HoldingRow {
  scheme_code: number
  scheme_name: string
  fund_house: string
  folio_id: string
  units: number              // SUM of (purchase - redemption) units
  avg_cost_nav: number       // weighted average purchase NAV
  total_invested: number     // SUM of purchase amounts
  current_nav: number | null // latest nav_prices.nav
  current_nav_date: string | null  // latest nav_prices.nav_date
  current_value: number | null     // units * current_nav
}

// Phase 2: Extended HoldingRow with computed analytics fields (not from DB)
export interface HoldingRowWithAnalytics extends HoldingRow {
  gain_loss: number | null
  gain_loss_pct: number | null
  xirr: number | null
}

// Raw transaction row from get_holder_analytics_transactions RPC
export interface AnalyticsTransaction {
  folio_id: string
  scheme_code: number
  scheme_name: string
  transaction_date: string   // ISO date string
  transaction_type: string
  amount: number
  units: number
  nav: number
}

// Holder-level analytics summary (computed in TypeScript from transactions + holdings)
export interface HolderAnalyticsSummary {
  total_aum: number
  total_invested: number
  gain_loss: number
  gain_loss_pct: number
  xirr: number | null
  nifty50_xirr: number | null  // benchmark synthetic XIRR; null if no nifty50_daily data
  period: string               // '1M' | '3M' | '6M' | '1Y' | '3Y' | 'all'
}

export interface Database {
  public: {
    Tables: {
      families: {
        Row: Family
        Insert: FamilyInsert
        Update: Partial<FamilyInsert>
        Relationships: []
      }
      holders: {
        Row: Holder
        Insert: HolderInsert
        Update: Partial<HolderInsert>
        Relationships: []
      }
      folios: {
        Row: Folio
        Insert: FolioInsert
        Update: Partial<FolioInsert>
        Relationships: []
      }
      transactions: {
        Row: Transaction
        Insert: TransactionInsert
        Update: Partial<TransactionInsert>
        Relationships: []
      }
      funds: {
        Row: Fund
        Insert: FundInsert
        Update: Partial<FundInsert>
        Relationships: []
      }
      nav_prices: {
        Row: NavPrice
        Insert: NavPriceInsert
        Update: Partial<NavPriceInsert>
        Relationships: []
      }
      grandfathering_nav: {
        Row: GrandfatheringNav
        Insert: GrandfatheringNavInsert
        Update: Partial<GrandfatheringNavInsert>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      get_holder_holdings: {
        Args: { p_holder_id: string }
        Returns: HoldingRow[]
      }
      get_holder_analytics_transactions: {
        Args: { p_holder_id: string; p_start_date?: string | null; p_end_date?: string }
        Returns: AnalyticsTransaction[]
      }
    }
  }
}

export interface Family {
  id: string                  // UUID
  user_id: string             // auth.users.id — owner
  name: string                // e.g. "The Sharma Family"
  created_at: string
  updated_at: string
}

export interface Holder {
  id: string                  // UUID
  family_id: string
  name: string                // "Rahul Sharma"
  pan: string                 // PAN number — unique per family
  pan_unmatched: boolean      // true if CAS PAN not found during import
  is_primary: boolean         // primary account holder
  created_at: string
  updated_at: string
}

export interface Folio {
  id: string                  // UUID
  holder_id: string
  folio_number: string        // CAMS/KFintech folio number
  scheme_code: number         // AMFI scheme code — FK to funds.scheme_code
  created_at: string
}

export interface Transaction {
  id: string                  // UUID
  folio_id: string
  transaction_date: string    // ISO date
  transaction_type: 'purchase' | 'redemption' | 'switch_in' | 'switch_out' | 'sip' | 'dividend_reinvest'
  units: number               // decimal precision 4
  nav: number                 // decimal precision 4
  amount: number              // decimal precision 2
  import_status: 'clean' | 'needs_review'
  source: 'cas_import' | 'manual'
  created_at: string
}

export interface Fund {
  scheme_code: number         // AMFI scheme code — primary key
  scheme_name: string
  fund_house: string          // AMC name
  category: string            // "Large Cap", "Debt - Short Duration", etc.
  scheme_type: string         // "Open Ended", "Close Ended"
  created_at: string
  updated_at: string
}

export interface NavPrice {
  id: string                  // UUID
  scheme_code: number         // FK to funds.scheme_code
  nav: number                 // decimal precision 4
  nav_date: string            // ISO date
  created_at: string
}

export interface GrandfatheringNav {
  scheme_code: number         // AMFI scheme code — primary key
  nav: number                 // NAV as of Jan 31, 2018
  nav_date: string            // should be '2018-01-31'
  created_at: string
}

// Insert types (omit generated fields)
export type FamilyInsert = Omit<Family, 'id' | 'created_at' | 'updated_at'>
export type HolderInsert = Omit<Holder, 'id' | 'created_at' | 'updated_at'>
export type FolioInsert = Omit<Folio, 'id' | 'created_at'>
export type TransactionInsert = Omit<Transaction, 'id' | 'created_at'>
export type FundInsert = Omit<Fund, 'created_at' | 'updated_at'>
export type NavPriceInsert = Omit<NavPrice, 'id' | 'created_at'>
export type GrandfatheringNavInsert = Omit<GrandfatheringNav, 'created_at'>

// Helper type aliases
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']
export type TablesRow<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

