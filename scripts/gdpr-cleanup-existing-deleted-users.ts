import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load environment variables from .env.local
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

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function gdprCleanupDeletedUsers() {
  console.log('🔍 Finding users marked as deleted...\n')

  // Find users with deleted_* or deleted-* emails
  const { data: deletedUsers, error } = await supabase
    .from('users')
    .select('*')
    .or('email.like.deleted_%@deleted.local,email.like.deleted-%@deleted.local')

  if (error) {
    console.error('❌ Error fetching users:', error)
    return
  }

  if (!deletedUsers || deletedUsers.length === 0) {
    console.log('✅ No deleted users found!')
    return
  }

  console.log(`Found ${deletedUsers.length} deleted user(s) to clean up:\n`)

  for (const user of deletedUsers) {
    console.log(`👤 ${user.name} ${user.surname}`)
    console.log(`   ID: ${user.id}`)
    console.log(`   Email: ${user.email}`)
    console.log(`   🧹 Applying GDPR-compliant cleanup...\n`)

    // Clear all personal data except name/surname
    const timestamp = Date.now()
    const { error: updateError } = await supabase
      .from('users')
      .update({
        // Clear all personal data
        email: `deleted-${timestamp}@deleted.local`,
        license_number: null,
        telephone: null,
        birthday: null,
        street: null,
        house_number: null,
        city: null,
        zip: null,
        country: null,
        emergency_contact_name: null,
        emergency_contact_phone: null,
        member_category: null,
        joined_at: null,
        functions: [],
        role: [],
        // Ensure left_at is set
        left_at: user.left_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (updateError) {
      console.log(`   ❌ Failed to clean up data: ${updateError.message}\n`)
      continue
    }

    console.log(`   ✅ Personal data cleared (kept: id, name, surname)\n`)

    // Try to delete from auth
    const { error: authError } = await supabase.auth.admin.deleteUser(user.id)

    if (authError) {
      if (authError.message?.toLowerCase().includes('user not found')) {
        console.log(`   ✅ Auth record already deleted\n`)
      } else {
        console.log(`   ⚠️  Could not delete auth record: ${authError.message}`)
        console.log(`   ℹ️  Please manually delete from Supabase Dashboard\n`)
      }
    } else {
      console.log(`   ✅ Auth record deleted\n`)
    }
  }

  console.log('✅ GDPR cleanup complete!')
  console.log('\n📋 Summary:')
  console.log('   - All personal data removed (address, phone, birthday, etc.)')
  console.log('   - Kept only: User ID, Name, Surname for historical records')
  console.log('   - Users will not appear in member lists anymore')
}

gdprCleanupDeletedUsers().catch(console.error)
