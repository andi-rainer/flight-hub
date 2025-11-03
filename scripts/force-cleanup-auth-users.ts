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

async function forceCleanupAuthUsers() {
  console.log('🔍 Finding users marked as deleted in database...\n')

  // Find users with deleted_* emails (already soft deleted in DB)
  const { data: deletedUsers, error } = await supabase
    .from('users')
    .select('id, email, name, surname')
    .like('email', 'deleted_%@deleted.local')

  if (error) {
    console.error('❌ Error fetching users:', error)
    return
  }

  if (!deletedUsers || deletedUsers.length === 0) {
    console.log('✅ No deleted users found in database!')
    return
  }

  console.log(`Found ${deletedUsers.length} user(s) marked as deleted:\n`)

  for (const user of deletedUsers) {
    console.log(`👤 ${user.name} ${user.surname}`)
    console.log(`   ID: ${user.id}`)
    console.log(`   DB Email: ${user.email}`)

    // Try to get user from auth to see current state
    const { data: authUser } = await supabase.auth.admin.getUserById(user.id)

    if (!authUser || !authUser.user) {
      console.log(`   ✅ User does not exist in auth - already cleaned up`)
      console.log('')
      continue
    }

    console.log(`   Auth Email: ${authUser.user.email}`)
    console.log(`   🔧 Attempting to force delete from auth using SQL...`)

    // Use SQL to directly delete from auth schema
    // This is more forceful than the admin.deleteUser API
    const { error: sqlError } = await supabase.rpc('delete_auth_user', {
      user_id: user.id
    })

    if (sqlError) {
      console.log(`   ⚠️  SQL deletion failed: ${sqlError.message}`)
      console.log(`   ℹ️  You may need to manually delete this user from Supabase Dashboard`)
      console.log(`   ℹ️  Go to: Authentication → Users → Find user and delete`)
    } else {
      console.log(`   ✅ Successfully force deleted from auth`)
    }
    console.log('')
  }

  console.log('✅ Cleanup complete!')
  console.log('\n📝 Note: If SQL deletion failed, you need to manually delete from Supabase Dashboard')
  console.log('   1. Go to your Supabase Dashboard')
  console.log('   2. Navigate to Authentication → Users')
  console.log('   3. Find users with email starting with "deleted_"')
  console.log('   4. Click the trash icon to delete them')
}

forceCleanupAuthUsers().catch(console.error)
