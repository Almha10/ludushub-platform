const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nxlzklfhyitiqgygzmfo.supabase.co';
const supabaseKey = 'sb_publishable_ZSfMgEewvF8Nef7xiE2Rfw_kFzuUXf9';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProfiles() {
  console.log('Fetching first profile record...');
  const { data, error } = await supabase.from('profiles').select('*').limit(1).single();
  
  if (error) {
    console.error('Error fetching profile:', error);
    return;
  }
  
  console.log('Columns in profiles table:', Object.keys(data));
}

checkProfiles();
