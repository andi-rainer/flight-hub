import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/store/voucher-types
 * Public endpoint - Returns active voucher types for store display
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: voucherTypes, error } = await supabase
      .from('voucher_types')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching voucher types:', error)
      return NextResponse.json(
        { error: 'Failed to fetch voucher types' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      voucherTypes: voucherTypes || [],
    })
  } catch (error) {
    console.error('Error in GET /api/store/voucher-types:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
