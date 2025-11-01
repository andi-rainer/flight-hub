import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { password } = await request.json()

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Get the configured password from system settings
    const { data: setting, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'tandem_registration_password')
      .single()

    if (error || !setting) {
      console.error('Error fetching password setting:', error)
      return NextResponse.json(
        { error: 'Configuration error' },
        { status: 500 }
      )
    }

    const configuredPassword = setting.value as string

    // Compare passwords
    if (password === configuredPassword) {
      return NextResponse.json({ success: true })
    }

    return NextResponse.json(
      { error: 'Incorrect password' },
      { status: 401 }
    )
  } catch (error) {
    console.error('Password verification error:', error)
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    )
  }
}
