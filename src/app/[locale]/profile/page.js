'use client';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { fetchUserClubs } from '@/lib/dataService';
import PlayerCard from '@/components/PlayerCard';
import { Link, useRouter } from '@/i18n/routing';
import { Heart, MessageSquare, Share2, Trash2, Image as ImageIcon, Send, X, UserCog } from 'lucide-react';
import styles from './page.module.css';

export default function ProfilePage() {
  const router = useRouter();

  const [userAuth, setUserAuth] = useState(null);
  const [profile, setProfile] = useState(null);
  const [userClubs, setUserClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Functional Posts State
  const [posts, setPosts] = useState([]);
  const [isComposing, setIsComposing] = useState(false);
  const [newPostText, setNewPostText] = useState('');
  const [newPostImage, setNewPostImage] = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    async function loadIdentity() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setLoading(false);
          return;
        }
        setUserAuth(user);

        // Fetch clubs
        const clubs = await fetchUserClubs(user.id);
        setUserClubs(clubs);

        let { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (!profileData && user) {
          // Clean initialization for new accounts - NO FAKE DATA
          const newPlayerTag = `AH-${Math.floor(Math.random() * 9000 + 1000)}`;
          const defaultUsername = user.user_metadata?.username || user.email.split('@')[0];
          
          const { data: newlyCreatedData, error: insError } = await supabase.from('profiles').insert({
            id: user.id,
            role: 'player', // Default role
            username: defaultUsername,
            player_tag: newPlayerTag,
            reputation: 'Rookie',
            level: 1,
            followers: 0,
            following: 0,
            achievements: 0,
            bio: "أهلاً بك في ArenaHub!",
            favorite_games: []
          }).select().single();
          
          if (insError) throw insError;
          profileData = newlyCreatedData;
        }

        if (profileData) {
          if (profileData.role === 'club') {
            router.push(`/clubs/${user.id}`);
            return;
          }
          setProfile(profileData);
          
          // Fetch authenticated user's posts
          const { data: userPosts } = await supabase
            .from('posts')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
            
          if (userPosts) {
            setPosts(userPosts);
          }
        }
      } catch (err) {
        console.error("Error fetching identity: ", err.message);
      } finally {
        setLoading(false);
      }
    }
    
    loadIdentity();
  }, []);

  const handleAvatarSelect = async (avatarId) => {
    setProfile(prev => ({ ...prev, avatar_url: avatarId }));
    try { await supabase.from('profiles').update({ avatar_url: avatarId }).eq('id', userAuth.id); } catch (err) {}
  };

  const handleUpdateName = async (newName) => {
    setProfile(prev => ({ ...prev, username: newName }));
    try { await supabase.from('profiles').update({ username: newName }).eq('id', userAuth.id); } catch (err) {}
  };

  const handleUpdateBio = async (newBio) => {
    setProfile(prev => ({ ...prev, bio: newBio }));
    try { await supabase.from('profiles').update({ bio: newBio }).eq('id', userAuth.id); } catch (err) {}
  };

  const handleUpdateRole = async (newRole) => {
    setProfile(prev => ({ ...prev, role: newRole }));
    try { await supabase.from('profiles').update({ role: newRole }).eq('id', userAuth.id); } catch (err) {}
  };

  const handleUploadAvatar = async (file) => {
    setIsUpdating(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${userAuth.id}-${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setProfile(prev => ({ ...prev, avatar_url: publicUrl }));
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', userAuth.id);
    } catch (err) {
      console.error("Upload error", err);
    } finally {
      setIsUpdating(false);
    }
  };

  // Posts Handlers
  const handlePublishPost = async () => {
    if (!newPostText.trim() && !newPostImage) return;

    const newPost = {
      user_id: userAuth.id,
      user_name: profile.username || 'مستخدم',
      user_tag: profile.player_tag ? `@${profile.player_tag}` : '',
      text: newPostText,
      content: newPostText,
      image: newPostImage || null,
      media: newPostImage || null,
      likes: 0,
      comments: 0
    };

    // Optimistically update
    const tempId = Date.now();
    setPosts([{ ...newPost, id: tempId, date: 'الآن', created_at: new Date().toISOString() }, ...posts]);
    setNewPostText('');
    setNewPostImage(null);
    setIsComposing(false);

    try {
      const { data, error } = await supabase.from('posts').insert([newPost]).select().single();
      if (!error && data) {
        setPosts(currentArgs => currentArgs.map(p => p.id === tempId ? data : p));
      }
    } catch(err) {
      console.warn('Silent fallback post failure', err);
    }
  };

  const handleDeletePost = (id) => {
    setPosts(posts.filter(p => p.id !== id));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setNewPostImage(url);
    }
  };

  if (loading) {
    return (
      <div className={styles.centerFill}>
        <div className={styles.skeletonCard}>
          <div className={styles.skelHeader}>
            <div className={styles.skelCircle}></div>
            <div style={{flex: 1}}>
              <div className={styles.skelLine}></div>
              <div className={`${styles.skelLine} ${styles.skelLineShort}`}></div>
            </div>
          </div>
          <div className={styles.skelBlock}></div>
          <div className={styles.skelLine}></div>
        </div>
        <h2 className="neon-text" style={{color: '#8B5CF6'}}>جاري تحميل هويتك...</h2>
      </div>
    );
  }

  if (!userAuth || !profile) {
    return (
      <div className={styles.centerFill}>
        <h2>يبدو أنك لم تقم بتسجيل الدخول!</h2>
        <div className={styles.titleWrapper} style={{marginBottom: '2rem'}}>
          <span className={styles.arSubtitle}>الرجاء تسجيل الدخول لعرض هويتك الرقمية</span>
        </div>
        <Link href="/auth" className="primary-button">أكمل ملفك الشخصي</Link>
      </div>
    );
  }

  const roleLabels = {
    'player': 'لاعب مجتمع',
    'coach': 'مدرب / محترف',
    'trainer': 'مدرب / محترف',
    'club_admin': 'مدير نادي',
    'admin': 'مشرف نظام',
    'guest': 'زائر'
  };

  const dynamicUser = {
    username: profile.role === 'club' ? profile.club_name : (profile.username || "لاعب غير معروف"),
    tag: profile.player_tag ? `#${profile.player_tag}` : <span className={styles.pulseTag}>جاري التحميل...</span>, 
    bio: profile.bio || "لا يوجد نبذة شخصية بعد.",
    avatar_url: profile.avatar_url,
    stats: {
      followers: profile.followers || 0,
      following: profile.following || 0,
      achievements: profile.achievements || 0,
      level: profile.level || 1,
      games: profile.favorite_games || []
    }
  };

  const activeTheme = profile.role === 'club' ? 'Cyberpunk' : (profile.theme || 'Neon Saudi');

  return (
    <div className={styles.wrapper}>
      <div className={styles.titleWrapper}>
        <h1 className={styles.titleHead}>المسيرة الاحترافية</h1>
        <span className={styles.arSubtitle}>إدارة هويتك ومنشوراتك وإنجازاتك</span>
      </div>
      
      <div className={styles.container} dir="rtl">
        {/* RIGHT COLUMN: Player ID Card */}
        <div className={styles.rightColumn}>
          <PlayerCard 
            {...dynamicUser} 
            clubs={userClubs}
            theme={activeTheme} 
            onUpdateName={handleUpdateName}
            onUpdateBio={handleUpdateBio}
            onUploadAvatar={handleUploadAvatar}
            onSelectPreset={handleAvatarSelect}
            isVerified={profile.reputation && profile.reputation !== 'Rookie'}
            status="متصل"
            roleDisplay={roleLabels[profile.role] || (profile.role === 'club' ? 'نادي رسمي' : 'لاعب مجتمع')}
            lastActivity="نشط الآن"
          />

          {/* Role & Settings Control Overlay */}
          <div className={`${styles.roleSelectorCard} glass-panel`} dir="rtl">
            <div className={styles.roleHead}>
              <UserCog size={16} />
              <span>تعديل الدور / الفئة</span>
            </div>
            <select 
              className={styles.roleSelect} 
              value={profile.role} 
              onChange={(e) => handleUpdateRole(e.target.value)}
            >
              <option value="player">لاعب (Player)</option>
              <option value="coach">مدرب (Coach)</option>
              <option value="trainer">محترف (Pro Trainer)</option>
              <option value="guest">زائر (Guest)</option>
            </select>
          </div>
        </div>

        {/* LEFT COLUMN: Posts Section */}
        <div className={styles.leftColumn}>
          <div className={styles.postsHeader}>
            <h2>منشوراتي</h2>
            {!isComposing && (
              <button className="primary-button" onClick={() => setIsComposing(true)}>
                إضافة منشور
              </button>
            )}
          </div>
          
          {/* Create Post Flow */}
          {isComposing && (
            <div className={`${styles.composeBox} glass-panel`}>
              <textarea 
                className={styles.composeInput}
                placeholder="ماذا تود أن تشارك مع اللاعبين؟"
                value={newPostText}
                onChange={(e) => setNewPostText(e.target.value)}
                autoFocus
              ></textarea>

              {newPostImage && (
                <div className={styles.previewImageWrapper}>
                  <img src={newPostImage} alt="مرفق" className={styles.previewImage} />
                  <button className={styles.removeImageBtn} onClick={() => setNewPostImage(null)}><X size={16} /></button>
                </div>
              )}

              <div className={styles.composeActions}>
                <div className={styles.composeUploadBtn}>
                  <ImageIcon size={20} color="rgba(255,255,255,0.6)" style={{cursor: 'pointer'}} onClick={() => fileInputRef.current.click()} />
                  <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageChange} hidden />
                </div>
                <div className={styles.composeButtons}>
                  <button className="secondary-button" style={{padding: '0.4rem 1rem'}} onClick={() => { setIsComposing(false); setNewPostText(''); setNewPostImage(null); }}>
                    إلغاء
                  </button>
                  <button className="primary-button" style={{padding: '0.4rem 1.5rem'}} onClick={handlePublishPost}>
                    <Send size={16} /> نشر
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className={styles.postsGrid}>
            {posts.length === 0 ? (
              <div className={styles.emptyState}>
                <p>لا يوجد أي منشورات حالياً.</p>
                <button className="secondary-button" onClick={() => setIsComposing(true)}>شاركنا بأول منشور!</button>
              </div>
            ) : (
              posts.map(post => (
                <div key={post.id} className={`${styles.postCard} glass-panel`}>
                  <div className={styles.postHeaderLine}>
                    <div className={styles.postAuthor}>
                      <img src={dynamicUser.avatar_url || 'https://via.placeholder.com/40'} alt="Avatar" className={styles.postAvatar}/>
                      <div>
                        <span className={styles.postName}>{dynamicUser.username}</span>
                        <span className={styles.postDate}>{post.date || new Date(post.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <button className={styles.actionBtnIcon} onClick={() => handleDeletePost(post.id)} title="حذف المنشور">
                      <Trash2 size={16} color="rgba(244, 63, 94, 0.7)" />
                    </button>
                  </div>
                  
                  <p className={styles.postContentLine}>{post.text || post.content}</p>
                  
                  {(post.image || post.media) && (
                    <img src={post.image || post.media} alt="Post" className={styles.postImage} />
                  )}

                  <div className={styles.postInteractions}>
                    <button className={styles.interactionBtn}><Heart size={18} /> {post.likes || 0}</button>
                    <button className={styles.interactionBtn}><MessageSquare size={18} /> {post.comments || 0}</button>
                    <button className={styles.interactionBtn}><Share2 size={18} /> مشاركة</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
