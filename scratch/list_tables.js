const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nxlzklfhyitiqgygzmfo.supabase.co';
const supabaseKey = 'sb_publishable_ZSfMgEewvF8Nef7xiE2Rfw_kFzuUXf9';
const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
  console.log('Attempting to list tables by querying common ones...');
  const tables = ['clubs', 'profiles', 'club_members', 'club_applications', 'club_announcements', 'posts', 'applications'];
  
  for (const table of tables) {
    const { error } = await supabase.from(table).select('count', { count: 'exact', head: true });
    if (error) {
      console.log(`Table "${table}": ERROR (${error.message})`);
    } else {
      console.log(`Table "${table}": EXISTS`);
    }
  }
}

listTables();
