import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://qmyjmmkscogctkoljxul.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFteWptbWtzY29nY3Rrb2xqeHVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NzIwNTAsImV4cCI6MjA5NDQ0ODA1MH0.kRvPYyTJLho9h0oa-QnrmwJiYUOZIW2xrkv_Ty7bvJo'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export type Project = {
  id: string; user_id: string; name: string; icon: string
  share_token: string; created_at: string
}
export type Transaction = {
  id: string; project_id: string; type: 'INCOME' | 'EXPENSE'
  title: string; amount: number; category: string; date: string
  notes?: string; quantity?: number; unit_price?: number
  receipt_url?: string; created_at: string
}
export type Category = {
  id: string; user_id: string; name: string
  type: 'INCOME' | 'EXPENSE'; color?: string
}
