const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nxlzklfhyitiqgygzmfo.supabase.co';
const supabaseKey = 'sb_publishable_ZSfMgEewvF8Nef7xiE2Rfw_kFzuUXf9';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAppsDetailed() {
  console.log('Testing club_applications...');
  
  // 1. Try a simple select to see error
  const { data, error } = await supabase.from('club_applications').select('*').limit(1);
  if (error) {
     console.error('Simple select error:', error.message);
  } else {
     console.log('Simple select success');
  }

  // 2. Try with joined profiles
  const { data: data2, error: error2 } = await supabase.from('club_applications').select('*, profiles(*)').limit(1);
  if (error2) {
     console.error('Join profiles error:', error2.message);
  } else {
     console.log('Join profiles success');
  }
}

checkAppsDetailed();
