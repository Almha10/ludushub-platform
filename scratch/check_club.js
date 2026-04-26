const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nxlzklfhyitiqgygzmfo.supabase.co';
const supabaseKey = 'sb_publishable_ZSfMgEewvF8Nef7xiE2Rfw_kFzuUXf9';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkClub() {
  const targetId = '3360b160-33ae-48b8-a1de-673fd95bbf5e';
  console.log(`Checking club with ID: ${targetId}`);
  
  try {
    const { data, error } = await supabase
      .from('clubs')
      .select('*')
      .eq('id', targetId)
      .maybeSingle();

    if (error) {
       console.error('Error fetching club:', error);
       return;
    }

    if (data) {
      console.log('Club found:', data);
    } else {
      console.log('No club found with that ID.');
      
      // Check all clubs to see what IDs are there
      console.log('Fetching all clubs to verify available IDs...');
      const { data: allClubs, error: allErr } = await supabase.from('clubs').select('id, name');
      if (allErr) {
        console.error('Error fetching all clubs:', allErr);
      } else {
        console.log('Available club IDs:', allClubs);
      }
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

checkClub();
