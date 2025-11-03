/**
 * Script to create initial admin user
 * Run with: npx tsx scripts/create-admin-user.ts
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load environment variables from .env.local manually
const envPath = resolve(process.cwd(), '.env.local')
const envContent = readFileSync(envPath, 'utf-8')
const envVars: Record<string, string> = {}

envContent.split('\n').forEach(line => {
  const trimmed = line.trim()
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...valueParts] = trimmed.split('=')
    if (key && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim()
    }
  }
})

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables. Make sure .env.local is set up correctly.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createAdminUser() {
  const email = 'admin@flighthub.com'
  const password = 'admin123'

  console.log('Creating admin user...')

  // Check if user already exists
  const { data: existingUser } = await supabase
    .from('users')
    .select('id, email')
    .eq('email', email)
    .single()

  if (existingUser) {
    console.log(`User ${email} already exists in database.`)

    // Check if they exist in auth
    const { data: authUsers } = await supabase.auth.admin.listUsers()
    const authUser = authUsers?.users.find(u => u.email === email)

    if (authUser) {
      console.log(`User ${email} already exists in auth.`)
      console.log('Updating password to: admin123')

      // Update password
      await supabase.auth.admin.updateUserById(authUser.id, {
        password: password
      })

      console.log('Password updated successfully!')
    } else {
      console.log('User exists in database but not in auth. This is an inconsistent state.')
      console.log('Please delete the user from the database and run this script again.')
    }

    return
  }

  // Create user in Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true,
    user_metadata: {
      name: 'Admin',
      surname: 'User'
    }
  })

  if (authError) {
    console.error('Error creating auth user:', authError)
    process.exit(1)
  }

  console.log('✓ Created auth user')

  // Create user profile
  const { error: profileError } = await supabase
    .from('users')
    .upsert({
      id: authData.user.id,
      email: email,
      name: 'Admin',
      surname: 'User',
      role: ['board', 'member']
    })

  if (profileError) {
    console.error('Error creating user profile:', profileError)
    // Clean up auth user
    await supabase.auth.admin.deleteUser(authData.user.id)
    process.exit(1)
  }

  console.log('✓ Created user profile')

  // Assign all functions
  const { data: functions } = await supabase
    .from('functions_master')
    .select('id')

  if (functions && functions.length > 0) {
    const functionAssignments = functions.map(f => ({
      user_id: authData.user.id,
      function_id: f.id,
      assigned_at: new Date().toISOString(),
      assigned_by: authData.user.id
    }))

    const { error: functionsError } = await supabase
      .from('user_functions')
      .insert(functionAssignments)

    if (functionsError) {
      console.error('Error assigning functions:', functionsError)
    } else {
      console.log(`✓ Assigned ${functions.length} functions`)
    }
  }

  // Assign Regular Membership
  const { data: membershipType } = await supabase
    .from('membership_types')
    .select('id')
    .eq('name', 'Regular Membership')
    .single()

  if (membershipType) {
    const { error: membershipError } = await supabase
      .from('user_memberships')
      .insert({
        user_id: authData.user.id,
        membership_type_id: membershipType.id,
        member_number: 'M-2025-001',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'active',
        auto_renew: true,
        payment_status: 'paid',
        notes: 'Initial admin membership',
        created_by: authData.user.id
      })

    if (membershipError) {
      console.error('Error assigning membership:', membershipError)
    } else {
      console.log('✓ Assigned Regular Membership')
    }
  }

  console.log('\n✅ Admin user created successfully!')
  console.log(`Email: ${email}`)
  console.log(`Password: ${password}`)
  console.log('\n⚠️  IMPORTANT: Change this password after first login!')
}

createAdminUser()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Unexpected error:', error)
    process.exit(1)
  })
