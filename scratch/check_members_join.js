const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nxlzklfhyitiqgygzmfo.supabase.co';
const supabaseKey = 'sb_publishable_ZSfMgEewvF8Nef7xiE2Rfw_kFzuUXf9';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMembersJoin() {
  console.log('Testing club_members join...');
  const { data, error } = await supabase.from('club_members').select('*, profiles(*)').limit(1);
  if (error) {
     console.error('Join profiles error:', error.message);
  } else {
     console.log('Join profiles success');
  }
}

checkMembersJoin();
