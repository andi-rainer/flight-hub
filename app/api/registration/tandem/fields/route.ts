import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createAdminClient()

    // Get custom fields from system settings
    const { data: setting, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'tandem_registration_custom_fields')
      .single()

    if (error) {
      console.error('Error fetching custom fields:', error)
      return NextResponse.json(
        { customFields: [] },
        { status: 200 }
      )
    }

    const customFields = Array.isArray(setting.value) ? setting.value : []

    return NextResponse.json({ customFields })
  } catch (error) {
    console.error('Custom fields fetch error:', error)
    return NextResponse.json(
      { customFields: [] },
      { status: 200 }
    )
  }
}
