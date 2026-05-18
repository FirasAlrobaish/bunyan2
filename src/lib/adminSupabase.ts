import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://qmyjmmkscogctkoljxul.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFteWptbWtzY29nY3Rrb2xqeHVsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODg3MjA1MCwiZXhwIjoyMDk0NDQ4MDUwfQ.yQd-MqY6q9US6FMqd0U3VE_iF6Hh52axOdJNmPvB3ts'

export const adminSupabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})
