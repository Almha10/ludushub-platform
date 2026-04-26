'use client';
import { useState, useEffect } from 'react';
import { useRouter } from '@/i18n/routing';
import { supabase } from '@/lib/supabaseClient';
import { fetchClubById, fetchClubMembers } from '@/lib/dataService';

export default function ClubDashboardRedirect() {
  const router = useRouter();
  const [status, setStatus] = useState('Checking your club identity...');

  useEffect(() => {
    async function resolveIdentity() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          router.push('/auth');
          return;
        }

        console.log("[DashboardResolve] User:", user.id);

        // 1. Try finding club by owner_user_id (new standard) or by ID (legacy PK)
        let { data: clubs, error: clubError } = await supabase
          .from('clubs')
          .select('id')
          .or(`owner_user_id.eq.${user.id},id.eq.${user.id}`)
          .order('id', { ascending: false }) // Prioritize some order if multiple
          .limit(1);

        if (clubs && clubs.length > 0) {
          const club = clubs[0];
          console.log("[DashboardResolve] Success: Club identity found ->", club.id);
          router.replace(`/clubs/${club.id}/dashboard`); // Redirect to actual dashboard
          return;
        }

        if (clubError && clubError.code !== 'PGRST116') {
           console.error("[DashboardResolve] Query Error:", clubError.message);
           setStatus(`Database connectivity issues: ${clubError.message}`);
           return;
        }

        // 2. Auto-heal: If no club, verify profile and create one
        console.log("[DashboardResolve] No club row. Checking user profile role...");
        const { data: profile, error: pErr } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        
        if (pErr) {
           console.error("[DashboardResolve] Profile Error:", pErr.message);
           setStatus("Your player profile is missing. Please try logging in again.");
           return;
        }

        console.log("[DashboardResolve] Profile Found. Role:", profile?.role);

        if (profile?.role === 'club') {
          setStatus('Initializing your club headquarters...');
          const newClub = {
            id: user.id,
            owner_user_id: user.id,
            name: profile.club_name || 'Organization',
            tag: profile.player_tag || 'ORG',
            location: profile.location || '',
            bio: profile.bio || 'تجمع احترافي للرياضات الإلكترونية',
            is_recruiting: true,
            contact_email: user.email,
            games: []
          };

          const { error: insError } = await supabase.from('clubs').upsert([newClub]);
          if (!insError) {
             console.log("[DashboardResolve] Record created. Binding membership...");
             await supabase.from('club_members').upsert([
               { club_id: user.id, user_id: user.id, role: 'club_admin' }
             ]);
             router.replace(`/clubs/${user.id}`);
          } else {
             console.error("[DashboardResolve] Final creation failed:", insError.message);
             setStatus(`Initialization failed: ${insError.message}`);
          }
        } else {
          console.warn("[DashboardResolve] Role mismatch. User is not a club.");
          router.replace('/profile');
        }
      } catch (err) {
        console.error("[DashboardResolve] CRITICAL RUNTIME EXCEPTION:", err);
        setStatus(`System Error: ${err.message}`);
      }
    }

    resolveIdentity();
  }, [router]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0B0F14', color: '#fff' }}>
      <div className="neon-text" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>LudusHub Identity System</div>
      <p style={{ color: 'rgba(255,255,255,0.6)' }}>{status}</p>
      <div style={{ marginTop: '2rem', width: '40px', height: '40px', border: '3px solid rgba(56, 189, 248, 0.1)', borderTopColor: '#38bdf8', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      <style jsx>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
