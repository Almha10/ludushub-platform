const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nxlzklfhyitiqgygzmfo.supabase.co';
const supabaseKey = 'sb_publishable_ZSfMgEewvF8Nef7xiE2Rfw_kFzuUXf9';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkApplicationsJoin() {
  console.log('Testing "applications" table join...');
  const { data, error } = await supabase.from('applications').select('*, profiles(*)').limit(1);
  if (error) {
     console.error('Join profiles error:', error.message);
  } else {
     console.log('Join profiles success');
  }
}

checkApplicationsJoin();
