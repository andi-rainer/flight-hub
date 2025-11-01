import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { UserMembershipInsert } from '@/lib/database.types'

export async function POST(request: Request) {
  try {
    const formData = await request.json()

    // Validate required fields
    const requiredFields = [
      'name',
      'surname',
      'email',
      'telephone',
      'birthday',
      'street',
      'house_number',
      'zip',
      'city',
      'country',
      'emergency_contact_name',
      'emergency_contact_phone',
    ]

    for (const field of requiredFields) {
      if (!formData[field]) {
        return NextResponse.json(
          { success: false, error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }

    if (!formData.terms_accepted) {
      return NextResponse.json(
        { success: false, error: 'Terms and conditions must be accepted' },
        { status: 400 }
      )
    }

    // Get configured tandem membership type
    const adminClient = createAdminClient()
    const { data: setting, error: settingError } = await adminClient
      .from('system_settings')
      .select('value')
      .eq('key', 'tandem_registration_membership_type')
      .single()

    if (settingError || !setting || !setting.value || setting.value === 'null') {
      console.error('Tandem membership type not configured:', settingError)
      return NextResponse.json(
        {
          success: false,
          error: 'Tandem registration is not configured. Please contact the club.',
        },
        { status: 500 }
      )
    }

    const membershipTypeId = setting.value as string

    // Check if user already exists
    const { data: existingUser } = await adminClient
      .from('users')
      .select('id')
      .eq('email', formData.email)
      .single()

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'An account with this email already exists. Please contact the club if you need assistance.',
        },
        { status: 400 }
      )
    }

    // Generate a random password (user doesn't need to know it)
    const randomPassword = Math.random().toString(36).slice(-16) + Math.random().toString(36).slice(-16)

    // Create auth user without email confirmation
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: formData.email,
      password: randomPassword,
      email_confirm: true, // Skip email confirmation
      user_metadata: {
        name: formData.name,
        surname: formData.surname,
      },
    })

    if (authError || !authData.user) {
      console.error('Error creating auth user:', authError)
      return NextResponse.json(
        { success: false, error: 'Failed to create account. Please try again.' },
        { status: 500 }
      )
    }

    // Update user profile (auto-created by trigger, now add additional fields)
    const { error: profileError } = await adminClient.from('users').update({
      telephone: formData.telephone,
      birthday: formData.birthday,
      street: formData.street,
      house_number: formData.house_number,
      zip: formData.zip,
      city: formData.city,
      country: formData.country,
      emergency_contact_name: formData.emergency_contact_name,
      emergency_contact_phone: formData.emergency_contact_phone,
      functions: [],
      joined_at: new Date().toISOString(),
    }).eq('id', authData.user.id)

    if (profileError) {
      console.error('Error creating user profile:', profileError)
      // Clean up auth user if profile creation fails
      await adminClient.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { success: false, error: 'Failed to create profile. Please try again.' },
        { status: 500 }
      )
    }

    // Get membership type details
    const { data: membershipType, error: typeError } = await adminClient
      .from('membership_types')
      .select('*')
      .eq('id', membershipTypeId)
      .single()

    if (typeError || !membershipType) {
      console.error('Error fetching membership type:', typeError)
      // Clean up user if membership type not found
      await adminClient.from('users').delete().eq('id', authData.user.id)
      await adminClient.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { success: false, error: 'Failed to complete registration. Please try again.' },
        { status: 500 }
      )
    }

    // Calculate end date based on duration
    const startDate = new Date()
    let endDate = new Date(startDate)
    switch (membershipType.duration_unit) {
      case 'days':
        endDate.setDate(endDate.getDate() + membershipType.duration_value)
        break
      case 'months':
        endDate.setMonth(endDate.getMonth() + membershipType.duration_value)
        break
      case 'years':
        endDate.setFullYear(endDate.getFullYear() + membershipType.duration_value)
        break
    }

    // Generate member number
    const { data: lastMember } = await adminClient
      .from('user_memberships')
      .select('member_number')
      .ilike('member_number', `${membershipType.member_number_prefix}%`)
      .order('member_number', { ascending: false })
      .limit(1)
      .single()

    let memberNumber: string
    if (lastMember && lastMember.member_number) {
      const lastNumber = parseInt(lastMember.member_number.replace(membershipType.member_number_prefix, ''))
      memberNumber = `${membershipType.member_number_prefix}${String(lastNumber + 1).padStart(4, '0')}`
    } else {
      memberNumber = `${membershipType.member_number_prefix}0001`
    }

    // Create membership record
    const membershipData: Omit<UserMembershipInsert, 'id' | 'created_at' | 'updated_at'> = {
      user_id: authData.user.id,
      membership_type_id: membershipTypeId,
      member_number: memberNumber,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      status: 'active',
      auto_renew: membershipType.auto_renew,
      payment_status: 'paid', // Tandem members are pre-paid
      notes: 'Tandem try-out registration - payment collected on-site',
      created_by: authData.user.id, // Self-created
    }

    const { data: newMembership, error: membershipError } = await adminClient
      .from('user_memberships')
      .insert(membershipData)
      .select()
      .single()

    if (membershipError) {
      console.error('Error creating membership:', membershipError)
      // Clean up user if membership creation fails
      await adminClient.from('users').delete().eq('id', authData.user.id)
      await adminClient.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { success: false, error: 'Failed to complete registration. Please try again.' },
        { status: 500 }
      )
    }

    // Update user's member_category
    await adminClient
      .from('users')
      .update({
        member_category: membershipType.member_category,
        updated_at: new Date().toISOString(),
      })
      .eq('id', authData.user.id)

    // Log initial payment status to history
    await adminClient
      .from('payment_status_history')
      .insert({
        membership_id: newMembership.id,
        old_status: null,
        new_status: 'paid',
        changed_by: authData.user.id,
      })

    return NextResponse.json({
      success: true,
      message: 'Registration successful! Welcome to the club.',
    })
  } catch (error) {
    console.error('Tandem registration error:', error)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
