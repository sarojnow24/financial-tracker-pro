
import { createClient } from '@supabase/supabase-js';

// Credentials for project: smart-budget-tracker
// Checks for environment variables first (Netlify Friendly), falls back to hardcoded demo keys.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://mkrwluisohhcfktnlohh.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rcndsdWlzb2hoY2ZrdG5sb2hoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1NTg1NjAsImV4cCI6MjA4MTEzNDU2MH0.IV4iPbf2xSSs1YI50Rw_6hISKzOK37dCBeN4YJzrYlE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);