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

async function cleanupCorruptedUsers() {
  console.log('🔍 Searching for corrupted users...\n')

  // Find users with deleted_* emails
  const { data: corruptedUsers, error } = await supabase
    .from('users')
    .select('id, email, name, surname, left_at')
    .like('email', 'deleted_%@deleted.local')

  if (error) {
    console.error('❌ Error fetching users:', error)
    return
  }

  if (!corruptedUsers || corruptedUsers.length === 0) {
    console.log('✅ No corrupted users found!')
    return
  }

  console.log(`Found ${corruptedUsers.length} corrupted user(s):\n`)

  for (const user of corruptedUsers) {
    console.log(`👤 ${user.name} ${user.surname}`)
    console.log(`   ID: ${user.id}`)
    console.log(`   Email: ${user.email}`)
    console.log(`   Left at: ${user.left_at || 'Not set'}\n`)

    // Check if user exists in auth
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(user.id)

    if (authError || !authUser) {
      console.log(`   ℹ️  User does not exist in auth - deletion was partially successful`)
      console.log(`   ✅ Database record is correctly marked as deleted\n`)
    } else {
      console.log(`   ⚠️  User still exists in auth - attempting to complete deletion...`)

      // Try to delete from auth
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)

      if (deleteError) {
        console.log(`   ❌ Failed to delete from auth: ${deleteError.message}\n`)
      } else {
        console.log(`   ✅ Successfully deleted from auth\n`)
      }
    }
  }

  console.log('✅ Cleanup complete!')
}

cleanupCorruptedUsers().catch(console.error)
