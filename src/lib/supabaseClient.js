import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase environment variables are missing. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env file.'
  );
}

// Create client with explicit config to handle potential fetch issues gracefully
export const supabase = createClient(
  supabaseUrl || '', 
  supabaseAnonKey || '',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce' // Improved security and reliability in modern Next.js
    },
    global: {
      fetch: async (url, options) => {
        try {
          const response = await fetch(url, options);
          return response;
        } catch (error) {
          if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
            console.error(
              `[Supabase Network Error] The client failed to connect to the Supabase server at ${url}. ` +
              'This usually means your network is down, the Supabase project is paused, or a firewall/proxy is blocking the request.'
            );
          }
          throw error;
        }
      }
    }
  }
);
