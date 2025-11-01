import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  // Verify user is authenticated and is board member
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile?.role?.includes('board')) {
    return NextResponse.json(
      { error: 'Not authorized - board members only' },
      { status: 403 }
    )
  }

  // Get all settings
  const { data: settings } = await supabase
    .from('system_settings')
    .select('key, value')
    .in('key', [
      'tandem_registration_membership_type',
      'tandem_registration_password',
      'tandem_registration_custom_fields',
    ])

  const result: any = {}

  settings?.forEach((setting) => {
    if (setting.key === 'tandem_registration_membership_type') {
      result.membershipTypeId = setting.value === 'null' || setting.value === null ? null : setting.value
    } else if (setting.key === 'tandem_registration_password') {
      result.password = setting.value || ''
    } else if (setting.key === 'tandem_registration_custom_fields') {
      result.customFields = Array.isArray(setting.value) ? setting.value : []
    }
  })

  return NextResponse.json(result)
}

export async function POST(request: Request) {
  const supabase = await createClient()

  // Verify user is authenticated and is board member
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile?.role?.includes('board')) {
    return NextResponse.json(
      { error: 'Not authorized - board members only' },
      { status: 403 }
    )
  }

  // Get data from request
  const { membershipTypeId, password, customFields } = await request.json()

  // Update all settings
  const updates = [
    {
      key: 'tandem_registration_membership_type',
      value: membershipTypeId,
    },
    {
      key: 'tandem_registration_password',
      value: password,
    },
    {
      key: 'tandem_registration_custom_fields',
      value: customFields || [],
    },
  ]

  for (const update of updates) {
    const { error } = await supabase
      .from('system_settings')
      .update({
        value: update.value,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq('key', update.key)

    if (error) {
      console.error(`Error updating ${update.key}:`, error)
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}
