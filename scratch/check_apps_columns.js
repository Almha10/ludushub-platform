const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nxlzklfhyitiqgygzmfo.supabase.co';
const supabaseKey = 'sb_publishable_ZSfMgEewvF8Nef7xiE2Rfw_kFzuUXf9';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAppsSchemaDetailed() {
  console.log('Fetching a single record or attempt a select to see headers if possible...');
  // Since table is empty, we can try to insert a temp record and then delete it to see columns if we can
  // Or just try selecting some suspected missing columns
  const cols = ['id', 'club_id', 'user_id', 'message', 'status', 'created_at', 'reviewed_at', 'reviewed_by'];
  const { data, error } = await supabase.from('club_applications').select(cols.join(',')).limit(1);
  
  if (error) {
    console.error('Error selecting suspected columns:', error.message);
    // Find which column is missing by trial and error is too slow.
    // I'll just check the error message, often it says "column X does not exist"
  } else {
    console.log('All suspected columns EXIST in club_applications');
  }
}

checkAppsSchemaDetailed();
