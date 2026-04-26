import { supabase } from './supabaseClient';

/**
 * @typedef {Object} Club
 * @property {string} id
 * @property {string} name
 * @property {string} tag
 * @property {string} owner_user_id
 * @property {string} [bio]
 * @property {string} [location]
 * @property {number} [members_count]
 * @property {number} [trophies]
 * @property {string[]} [games]
 * @property {number} [power_level]
 * @property {boolean} is_recruiting
 * @property {string[]} [badges]
 * @property {string} [banner_url]
 * @property {string} [logo_url]
 * @property {string} [cover_image_url]
 * @property {boolean} is_verified
 */

// ==========================================
// USER & PROFILES
// ==========================================

export const fetchUserProfile = async (userId) => {
  const start = performance.now();
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, player_tag, bio')
      .eq('id', userId)
      .single();
    if (error) throw error;
    console.log(`[DataService] fetchUserProfile SUCCESS for ${userId} in ${(performance.now() - start).toFixed(2)}ms`);
    return data;
  } catch (err) {
    console.error(`[DataService] fetchUserProfile error for ${userId}:`, JSON.stringify(err, null, 2));
    return null;
  }
};

export const fetchUserClubs = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('club_members')
      .select('club_id, clubs(id, name, tag)')
      .eq('user_id', userId);
    
    if (error) throw error;
    return data.map(item => item.clubs);
  } catch (err) {
    console.error('[DataService] fetchUserClubs error:', err);
    return [];
  }
};

// ==========================================

export const fetchSpacePosts = async (gameFilter) => {
  try {
    let query = supabase.from('posts').select('*').order('created_at', { ascending: false });
    
    if (gameFilter && gameFilter !== 'All') {
      query = query.eq('game', gameFilter);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('[DataService] fetchSpacePosts Supabase error:', JSON.stringify(error, null, 2));
      
      // If table doesn't exist (PGRST205), return empty array instead of failing
      if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
        console.info('[DataService] Posts table is currently missing. Visit Spaces later after running SQL migrations.');
        return [];
      }
      throw error;
    }
    return data || [];
  } catch (err) {
    console.error('[DataService] fetchSpacePosts FATAL error:', JSON.stringify(err, null, 2));
    return []; // Return empty array to keep UI alive
  }
};

export const subscribeToPosts = (gameFilter, onInsert) => {
  return supabase
    .channel('public:posts')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, payload => {
       if (gameFilter === 'All' || payload.new.game === gameFilter) {
         onInsert(payload.new);
       }
    })
    .subscribe();
};

export const insertPost = async (postPayload) => {
  try {
    const { data, error } = await supabase.from('posts').insert([postPayload]).select().single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[DataService] insertPost error:', err);
    throw err;
  }
};

export const incrementPostLike = async (postId, currentLikes) => {
  try {
    const { error } = await supabase.from('posts').update({ likes: currentLikes + 1 }).eq('id', postId);
    if (error) throw error;
  } catch (err) {
    console.error('[DataService] incrementPostLike error:', err);
    throw err;
  }
};

export const incrementPostRepost = async (postId, currentReposts) => {
  try {
    const { error } = await supabase.from('posts').update({ reposts: currentReposts + 1 }).eq('id', postId);
    if (error) throw error;
  } catch (err) {
    console.error('[DataService] incrementPostRepost error:', err);
    throw err;
  }
};

// ==========================================
// CLUB CORE SYSTEM
// ==========================================

// NOTE: logo_url, banner_url, cover_image_url MUST be in every club select.
const CLUB_COLUMNS = 'id, name, tag, owner_user_id, bio, location, is_recruiting, power_level, trophies, games, members, contact_email, logo_url, banner_url, cover_image_url, is_verified';

/**
 * Fetch all clubs with optional game filter
 */
export const fetchClubs = async (gameFilter) => {
  const start = performance.now();
  try {
    let query = supabase
      .from('clubs')
      .select(CLUB_COLUMNS)
      .order('power_level', { ascending: false });
    
    if (gameFilter && gameFilter !== 'All') {
      query = query.contains('games', [gameFilter]); 
    }

    const { data, error } = await query;
    if (error) {
      console.warn(`[DataService] fetchClubs full select failed: ${error.message}. Trying fallback.`);
      
      let fallbackQuery = supabase
        .from('clubs')
        .select('id, name, tag, location, bio, is_recruiting')
        .order('id', { ascending: false });

      if (gameFilter && gameFilter !== 'All') {
        fallbackQuery = fallbackQuery.contains('games', [gameFilter]);
      }

      const { data: fbData, error: fbErr } = await fallbackQuery;
      if (fbErr) throw fbErr;
      
      return (fbData || []).map(c => ({
        ...c,
        logo_url: null,
        banner_url: null,
        cover_image_url: null,
        members: 0,
        power_level: 0,
        trophies: 0,
        games: []
      }));
    }
    
    console.log(`[DataService] fetchClubs SUCCESS in ${(performance.now() - start).toFixed(2)}ms`);
    return data || [];
  } catch (err) {
    console.error(`[DataService] fetchClubs FATAL error:`, JSON.stringify(err, null, 2));
    return []; 
  }
};

/**
 * Fetch a single club by ID or Owner ID
 * FIX: Includes logo_url, banner_url, cover_image_url — previously missing.
 */
export const fetchClubById = async (clubId, useOwnerId = false) => {
  if (!clubId) return null;
  const start = performance.now();
  
  try {
    // Attempt full fetch first
    let query = supabase.from('clubs').select(CLUB_COLUMNS);
    if (useOwnerId) {
      query = query.eq('owner_user_id', clubId);
    } else {
      query = query.eq('id', clubId);
    }
    
    const { data, error } = await query.maybeSingle();
    
    if (error) {
      // Fallback: Try a minimal fetch if columns are missing (common during migration)
      console.warn(`[DataService] fetchClubById: Full fetch failed, trying minimal fallback. Error: ${error.message}`);
      
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('clubs')
        .select('id, name, tag, owner_user_id, bio, location, is_recruiting')
        .eq(useOwnerId ? 'owner_user_id' : 'id', clubId)
        .maybeSingle();
        
      if (fallbackError) {
        console.error(`[DataService] fetchClubById Fallback also FAILED:`, fallbackError.message);
        return null;
      }
      
      if (fallbackData) {
        console.log(`[DataService] fetchClubById SUCCESS (Fallback) for ${clubId}`);
        return {
          ...fallbackData,
          logo_url: null,
          banner_url: null,
          cover_image_url: null,
          is_verified: false,
          power_level: 0,
          trophies: 0,
          games: [],
          members: 1
        };
      }
      return null;
    }
    
    if (data) {
      console.log(`[DataService] fetchClubById SUCCESS: "${data.name}" found in ${(performance.now() - start).toFixed(2)}ms`);
    } else {
      console.log(`[DataService] fetchClubById: No club record found for ${clubId} (useOwnerId: ${useOwnerId})`);
    }

    return data;
  } catch (err) {
    console.error(`[DataService] fetchClubById FATAL:`, err);
    return null;
  }
};

/**
 * Create a new club (requires authenticated user)
 */
export const createClub = async (clubData) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required");

    const payload = {
      ...clubData,
      owner_user_id: user.id,
      power_level: 0,
      trophies: 0,
      members: 1
    };

    const { data, error } = await supabase.from('clubs').insert([payload]).select().single();
    if (error) throw error;

    // Automatically add owner as first member
    await supabase.from('club_members').insert([
      { club_id: data.id, user_id: user.id, role: 'owner' }
    ]);

    return data;
  } catch (err) {
    console.error('[DataService] createClub error:', err);
    throw err;
  }
};

/**
 * Update club profile (must be owner/admin — enforced by RLS)
 */
export const updateClubProfile = async (clubId, updates) => {
  try {
    // Strip image fields from this update — images use their own upload path
    const { data, error } = await supabase
      .from('clubs')
      .update(updates)
      .eq('id', clubId)
      .select(CLUB_COLUMNS)
      .maybeSingle();

    if (error) {
      console.warn(`[DataService] updateClubProfile: Full select failed, trying minimal return. Error: ${error.message}`);
      const { data: fbData } = await supabase
        .from('clubs')
        .update(updates)
        .eq('id', clubId)
        .select('id, name, tag')
        .maybeSingle();
      return fbData;
    }
    return data;
  } catch (err) {
    console.error('[DataService] updateClubProfile error:', err);
    throw err;
  }
};

/**
 * Delete a club (Only owner — enforced by RLS)
 */
export const deleteClub = async (clubId) => {
  try {
    await Promise.all([
      supabase.from('club_members').delete().eq('club_id', clubId),
      supabase.from('club_applications').delete().eq('club_id', clubId),
      supabase.from('club_announcements').delete().eq('club_id', clubId),
    ]);
    
    const { error } = await supabase.from('clubs').delete().eq('id', clubId);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('[DataService] deleteClub error:', err);
    throw err;
  }
};

// ==========================================
// CLUB IMAGE UPLOAD (Supabase Storage)
// ==========================================

const CLUB_BUCKET = 'club-assets';
const MAX_FILE_SIZE_MB = 5;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/**
 * Upload a club image (logo or cover) to Supabase Storage and save URL to DB.
 * @param {string} clubId - Club UUID
 * @param {File} file - The File object from input
 * @param {'logo' | 'cover'} imageType - Which field to update
 * @returns {{ url: string, club: Object }}
 */
export const uploadClubImage = async (clubId, file, imageType) => {
  if (!file) throw new Error('لم يتم اختيار ملف');

  // Validate type
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(`نوع الملف غير مدعوم. الأنواع المقبولة: JPG, PNG, WebP, GIF`);
  }

  // Validate size
  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > MAX_FILE_SIZE_MB) {
    throw new Error(`حجم الملف كبير جداً. الحد الأقصى ${MAX_FILE_SIZE_MB}MB`);
  }

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) throw new Error('يجب تسجيل الدخول لرفع الصور');

  // Build storage path: {userId}/{clubId}/{imageType}.{ext}
  const ext = file.name.split('.').pop();
  const storagePath = `${user.id}/${clubId}/${imageType}.${ext}`;

  // Upload to storage (upsert = replace existing)
  const { error: uploadErr } = await supabase.storage
    .from(CLUB_BUCKET)
    .upload(storagePath, file, { upsert: true, contentType: file.type });

  if (uploadErr) {
    console.error('[DataService] uploadClubImage storage error:', uploadErr);
    throw new Error(`فشل رفع الصورة: ${uploadErr.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(CLUB_BUCKET)
    .getPublicUrl(storagePath);

  const publicUrl = urlData?.publicUrl;
  if (!publicUrl) throw new Error('تعذّر الحصول على رابط الصورة العام');

  // Update DB column
  const dbField = imageType === 'logo' ? 'logo_url' : 'cover_image_url';
  const { data: updatedClub, error: dbErr } = await supabase
    .from('clubs')
    .update({ [dbField]: publicUrl })
    .eq('id', clubId)
    .select(CLUB_COLUMNS)
    .maybeSingle();

  if (dbErr) {
    console.warn('[DataService] uploadClubImage DB full select failed, trying minimal update return.');
    const { data: fbClub } = await supabase
      .from('clubs')
      .update({ [dbField]: publicUrl })
      .eq('id', clubId)
      .select('id, name')
      .maybeSingle();
      
    if (!fbClub) throw new Error(`تم رفع الصورة ولكن فشل تحديث قاعدة البيانات: ${dbErr.message}`);
    return { url: publicUrl, club: fbClub };
  }

  return { url: publicUrl, club: updatedClub };
};

/**
 * Remove a club image from storage and clear the DB field.
 * @param {string} clubId
 * @param {'logo' | 'cover'} imageType
 */
export const removeClubImage = async (clubId, imageType) => {
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) throw new Error('يجب تسجيل الدخول');

  // Try common extensions
  const dbField = imageType === 'logo' ? 'logo_url' : 'cover_image_url';
  const extensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

  // Fire delete for all possible paths (ignore errors — bucket may not have all)
  const deletePaths = extensions.map(ext => `${user.id}/${clubId}/${imageType}.${ext}`);
  await supabase.storage.from(CLUB_BUCKET).remove(deletePaths);

  // Clear DB field
  const { data: updatedClub, error: dbErr } = await supabase
    .from('clubs')
    .update({ [dbField]: null })
    .eq('id', clubId)
    .select(CLUB_COLUMNS)
    .single();

  if (dbErr) throw new Error(`فشل مسح رابط الصورة: ${dbErr.message}`);
  return updatedClub;
};

// ==========================================
// CLUB MEMBERSHIP & ROLES
// ==========================================

export const fetchClubMembers = async (clubId) => {
  if (!clubId) return [];
  const start = performance.now();
  try {
    const { data: members, error } = await supabase
      .from('club_members')
      .select('id, role, user_id')
      .eq('club_id', clubId)
      .order('role', { ascending: true });
       
    if (error) {
      console.warn(`[DataService] fetchClubMembers Error:`, error.message);
      return [];
    }

    if (!members || members.length === 0) return [];

    // Manual join with profiles
    const userIds = [...new Set(members.map(m => m.user_id))];
    const { data: profiles, error: pErr } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, player_tag')
      .in('id', userIds);

    if (pErr) {
      console.warn(`[DataService] fetchClubMembers Profiles Join FAIL:`, pErr.message);
      return members;
    }

    const profileMap = Object.fromEntries(profiles.map(p => [p.id, p]));
    const joined = members.map(m => ({
      ...m,
      profiles: profileMap[m.user_id] || null
    }));
    
    console.log(`[DataService] fetchClubMembers manual join success in ${(performance.now() - start).toFixed(2)}ms`);
    return joined;
  } catch(err) {
    console.error(`[DataService] fetchClubMembers Fatal:`, err);
    return [];
  }
};

export const updateMemberRole = async (memberId, newRole) => {
  try {
    const { error } = await supabase.from('club_members').update({ role: newRole }).eq('id', memberId);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('[DataService] updateMemberRole error:', err);
    throw err;
  }
};

export const removeMember = async (memberId) => {
  try {
    const { error } = await supabase.from('club_members').delete().eq('id', memberId);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('[DataService] removeMember error:', err);
    throw err;
  }
};

export const leaveClub = async (clubId) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required");

    const { error } = await supabase
      .from('club_members')
      .delete()
      .eq('club_id', clubId)
      .eq('user_id', user.id);
      
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('[DataService] leaveClub error:', err);
    throw err;
  }
};

/**
 * Check if the current user is a member/admin of a club
 */
export const getMyMembership = async (clubId) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('club_members')
      .select('*')
      .eq('club_id', clubId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) return null;
    return data;
  } catch (err) {
    return null;
  }
};

/**
 * Check if the current user has a pending application for this club
 */
export const getMyApplication = async (clubId) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('club_applications')
      .select('*')
      .eq('club_id', clubId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return null;
    return data;
  } catch (err) {
    return null;
  }
};

// ==========================================
// RECRUITMENT & APPLICATIONS
// ==========================================

/**
 * Submit a join request.
 * FIX: Now returns the created application record.
 * FIX: Duplicate detection gives clear user-facing message.
 */
export const applyToClub = async (clubId, userId, message) => {
  console.log('[DataService] applyToClub called', { clubId, userId });

  // 0. Already a member?
  const { data: member } = await supabase
    .from('club_members')
    .select('id')
    .eq('club_id', clubId)
    .eq('user_id', userId)
    .maybeSingle();
  
  if (member) {
    throw new Error("أنت بالفعل عضو في هذا النادي");
  }

  // 1. Club must be recruiting
  const club = await fetchClubById(clubId);
  if (!club) throw new Error("النادي غير موجود");
  if (!club.is_recruiting) {
    throw new Error("هذا النادي لا يقبل طلبات انضمام حالياً");
  }

  // 2. Check for existing pending application (explicit, not relying on DB constraint alone)
  const { data: existingApp } = await supabase
    .from('club_applications')
    .select('id, status')
    .eq('club_id', clubId)
    .eq('user_id', userId)
    .eq('status', 'pending')
    .maybeSingle();

  if (existingApp) {
    throw new Error("لديك طلب انضمام معلق بالفعل. يرجى الانتظار حتى يتم مراجعته");
  }

  // 3. Insert application
  const { data, error } = await supabase
    .from('club_applications')
    .insert([{ club_id: clubId, user_id: userId, message: message || '', status: 'pending' }])
    .select()
    .single();
  
  if (error) {
    console.error('[DataService] applyToClub insert error:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    // code 23505 = unique_violation (backup — our explicit check above should catch first)
    if (error.code === '23505') {
      throw new Error("لديك طلب انضمام معلق بالفعل");
    }
    throw new Error(`فشل إرسال الطلب: ${error.message}`);
  }

  console.log('[DataService] applyToClub SUCCESS, inserted id:', data?.id);
  return data;
};

/**
 * Fetch club applications with optional status filter.
 * Always includes profile join.
 */
export const fetchClubApplications = async (clubId, statusFilter = null) => {
  if (!clubId) return [];
  const start = performance.now();
  try {
    console.log(`[DataService] fetchClubApplications start — club: ${clubId}, filter: ${statusFilter || 'all'}`);
    
    let query = supabase
      .from('club_applications')
      .select('*')
      .eq('club_id', clubId)
      .order('created_at', { ascending: false });
    
    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }
    
    const { data: apps, error } = await query;
    
    if (error) {
      console.error('[DataService] fetchClubApplications DB Error:', error.message, error.code, error.hint);
      return [];
    }

    console.log(`[DataService] fetchClubApplications raw count: ${apps?.length ?? 0}`);

    if (!apps || apps.length === 0) return [];

    // Manual join with profiles
    const userIds = [...new Set(apps.map(a => a.user_id))];
    const { data: profiles, error: pErr } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, player_tag, level')
      .in('id', userIds);

    if (pErr) {
       console.warn('[DataService] fetchClubApplications Profiles Join FAIL:', pErr.message);
       return apps;
    }

    const profileMap = Object.fromEntries(profiles.map(p => [p.id, p]));
    const joined = apps.map(a => ({
       ...a,
       profiles: profileMap[a.user_id] || null
    }));

    console.log(`[DataService] fetchClubApplications SUCCESS in ${(performance.now() - start).toFixed(2)}ms — ${joined.length} records`);
    return joined;
  } catch(err) {
    console.error('[DataService] fetchClubApplications Fatal:', err);
    return [];
  }
};

/**
 * Update application status and handle membership creation if accepted.
 * FIX: uses 'accepted' consistently — dashboard now calls with 'accepted'/'rejected'.
 */
export const updateApplicationStatus = async (appId, newStatus) => {
   try {
     const { data: { user } } = await supabase.auth.getUser();
     if (!user) throw new Error("Unauthorized");

     // 1. Update application status
     const { data: app, error: appError } = await supabase
       .from('club_applications')
       .update({ 
         status: newStatus,
         reviewed_at: new Date().toISOString(),
         reviewed_by: user.id
       })
       .eq('id', appId)
       .select('*')
       .single();

     if (appError) throw appError;

     // 2. If accepted, add as club member (prevent duplicate with upsert / ignore conflict)
     if (newStatus === 'accepted' && app) {
       // First check they aren't already a member
       const { data: existingMember } = await supabase
         .from('club_members')
         .select('id')
         .eq('club_id', app.club_id)
         .eq('user_id', app.user_id)
         .maybeSingle();

       if (!existingMember) {
         const { error: memberError } = await supabase.from('club_members').insert([
           { 
             club_id: app.club_id, 
             user_id: app.user_id, 
             role: 'Member' 
           }
         ]);
         if (memberError) {
           console.error('[DataService] Failed to create member after acceptance:', memberError);
           // Don't throw — the status update succeeded; member insert is secondary
         }
       }
     }
     
     return newStatus;
   } catch(err) {
     console.error('[DataService] updateApplicationStatus error:', err);
     throw err;
   }
};

// ==========================================
// ANNOUNCEMENTS
// ==========================================

export const fetchClubAnnouncements = async (clubId) => {
  if (!clubId) return [];
  try {
    const { data, error } = await supabase
      .from('club_announcements')
      .select('*')
      .eq('club_id', clubId)
      .order('created_at', { ascending: false });
      
    if (error) {
      console.warn('[DataService] fetchClubAnnouncements Supabase Error:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('[DataService] fetchClubAnnouncements Fatal Error:', err);
    return [];
  }
};

export const postClubAnnouncement = async (announcement) => {
  try {
    const { data, error } = await supabase.from('club_announcements').insert([announcement]).select().single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[DataService] postClubAnnouncement error:', err);
    throw err;
  }
};

export const deleteClubAnnouncement = async (annId) => {
  try {
    const { error } = await supabase.from('club_announcements').delete().eq('id', annId);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('[DataService] deleteClubAnnouncement error:', err);
    throw err;
  }
};
