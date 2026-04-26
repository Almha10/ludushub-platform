const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nxlzklfhyitiqgygzmfo.supabase.co';
const supabaseKey = 'sb_publishable_ZSfMgEewvF8Nef7xiE2Rfw_kFzuUXf9';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAppsSchema() {
  console.log('Fetching first club_applications record...');
  const { data, error } = await supabase.from('club_applications').select('*').limit(1).maybeSingle();
  
  if (error) {
    console.error('Error fetching club_applications:', error);
    return;
  }
  
  if (data) {
    console.log('Columns in club_applications table:', Object.keys(data));
  } else {
    console.log('No applications found. Trying to find any record to see columns...');
    // Fallback: check if we can get column names via an empty select
     const { data: all } = await supabase.from('club_applications').select('*').limit(1);
     if (all && all.length > 0) {
        console.log('Columns:', Object.keys(all[0]));
     } else {
        console.log('Table might be empty. Checking another way...');
     }
  }
}

checkAppsSchema();
