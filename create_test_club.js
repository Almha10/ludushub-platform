const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nxlzklfhyitiqgygzmfo.supabase.co';
const supabaseAnonKey = 'sb_publishable_ZSfMgEewvF8Nef7xiE2Rfw_kFzuUXf9';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createClub() {
  const email = 'falcons@ludushub.club';
  const password = 'SecurePassword123!';
  
  // Try sign up
  console.log("Attempting to sign up...");
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    console.error("Sign up error:", error.message);
    // If user already registered, lets see if we can log in
    if (error.message.includes("User already registered") || error.message.includes("already")) {
        console.log("Trying to sign in...");
        const { data: inData, error: inError } = await supabase.auth.signInWithPassword({ email, password });
        if (inError) console.error("Login failed:", inError.message);
        else console.log("Login successful! User ID:", inData.user.id);
    }
    return;
  }
  
  console.log("Signed up!");
  
  if (data?.user) {
    console.log("User ID:", data.user.id);
    console.log("Setting up profile as club...");
    
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: data.user.id,
        role: 'club',
        club_name: 'Falcons Esports (Official)',
        location: 'الرياض, السعودية',
        bio: 'الحساب الرسمي لتجربة نظام إدارة الأندية'
      });
      
    if (profileError) {
      console.error("Profile Error:", profileError.message);
    } else {
      console.log("Profile successfully injected!");
    }
  }
}

createClub();
