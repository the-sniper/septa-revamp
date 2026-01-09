
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables: URL or KEY not found.');
  // We can't throw here inside the module scope easily without crashing build sometimes, 
  // but it's better to fail loud for the API info.
}

// Admin client for backend operations (skips RLS if service key used, respects RLS if anon key used)
export const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
