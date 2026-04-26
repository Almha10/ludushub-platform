const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nxlzklfhyitiqgygzmfo.supabase.co',
  'sb_publishable_ZSfMgEewvF8Nef7xiE2Rfw_kFzuUXf9'
);

async function debugClub() {
  const clubId = '3360b160-33ae-48b8-a1de-673fd95bbf5e';
  console.log(`[Diagnostic] Querying club: ${clubId}`);
  
  const start = Date.now();
  try {
    const { data, error } = await supabase
      .from('clubs')
      .select('*')
      .eq('id', clubId)
      .maybeSingle();
      
    console.log(`[Diagnostic] Query took ${Date.now() - start}ms`);
    if (error) {
      console.error('[Diagnostic] Error:', JSON.stringify(error, null, 2));
    } else {
      console.log('[Diagnostic] Result:', data ? `Found: ${data.name}` : 'Not Found');
    }
  } catch (err) {
    console.error('[Diagnostic] Fatal:', err);
  }
}

debugClub();
