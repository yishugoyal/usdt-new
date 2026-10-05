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

// Use service_role key for server-side operations if valid, fallback to anon key
const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim().replace(/^["']|["']$/g, '');
const isPlaceholder = !serviceKey || serviceKey.includes('...') || serviceKey.length < 25;
const rawAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim().replace(/^["']|["']$/g, '');
const supabaseKey = (isPlaceholder ? rawAnonKey : serviceKey) || 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseKey);

