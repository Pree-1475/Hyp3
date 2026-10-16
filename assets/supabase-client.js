/**
 * HYP3 Supabase Client Helper
 * Dynamically fetches credentials from /api/config (injected by Vercel Supabase integration)
 */

let supabaseClient = null;

async function getSupabase() {
  if (supabaseClient) return supabaseClient;

  try {
    const res = await fetch('/api/config');
    const config = await res.json();

    if (config.supabaseUrl && config.supabaseAnonKey) {
      if (window.supabase && typeof window.supabase.createClient === 'function') {
        supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
        console.log('✅ Supabase connected dynamically via Vercel integration');
      }
    } else {
      console.warn('⚠️ Supabase credentials not found from /api/config. Running in fallback mode.');
    }
  } catch (err) {
    console.warn('⚠️ Could not load /api/config. Running in fallback mode.', err);
  }

  return supabaseClient;
}

window.getSupabase = getSupabase;
