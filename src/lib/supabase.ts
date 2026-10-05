import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
// Use service_role key for server-side operations if valid, fallback to anon key
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const isPlaceholder = !serviceKey || serviceKey.includes('...') || serviceKey.length < 25;
const supabaseKey = isPlaceholder
  ? (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')
  : serviceKey;

export const supabase = createClient(supabaseUrl, supabaseKey);

