import { createClient } from '@supabase/supabase-js';

function getSanitizedUrl(url: string | undefined): string {
  if (!url) return 'https://placeholder.supabase.co';
  const trimmed = url.trim().replace(/^["']|["']$/g, '');
  const match = trimmed.match(/https?:\/\/[^\s)\]"']+/);
  if (match) return match[0];
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return 'https://placeholder.supabase.co';
}

const supabaseUrl = getSanitizedUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);

// Server-side database operations should use SUPABASE_SERVICE_ROLE_KEY to bypass RLS securely
const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim().replace(/^["']|["']$/g, '');
const isPlaceholder = !serviceKey || serviceKey.includes('...') || serviceKey.length < 25;
const rawAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim().replace(/^["']|["']$/g, '');
const supabaseKey = (isPlaceholder ? rawAnonKey : serviceKey) || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});


