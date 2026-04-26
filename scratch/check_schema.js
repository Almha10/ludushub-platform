const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nxlzklfhyitiqgygzmfo.supabase.co';
const supabaseKey = 'sb_publishable_ZSfMgEewvF8Nef7xiE2Rfw_kFzuUXf9';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('Fetching first club record to see all column names...');
  const { data, error } = await supabase.from('clubs').select('*').limit(1).single();
  
  if (error) {
    console.error('Error fetching club:', error);
    return;
  }
  
  console.log('Columns in clubs table:', Object.keys(data));
}

checkSchema();
