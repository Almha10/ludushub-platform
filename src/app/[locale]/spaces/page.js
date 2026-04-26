'use client';
import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { Heart, Repeat2, MessageSquare, Share, Image as ImageIcon, Users, Flame, Gamepad2 } from 'lucide-react';
import { fetchSpacePosts, subscribeToPosts, insertPost, incrementPostLike, incrementPostRepost } from '@/lib/dataService';
import { supabase } from '@/lib/supabaseClient';
import styles from './page.module.css';

// Helper to calculate relative time
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'الآن';
  if (hours < 24) return `منذ ${hours}س`;
  return `منذ ${Math.floor(hours/24)}ي`;
}

export default function SpacesPage() {
  const t = useTranslations('Spaces');
  const searchParams = useSearchParams();
  const initialGameUrlParam = searchParams.get('game');
  
  const [activeFilter, setActiveFilter] = useState(initialGameUrlParam || "All");
  const [gamesList, setGamesList] = useState(["All", "Valorant", "FC 24", "Elden Ring"]);
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [newPostContent, setNewPostContent] = useState('');
  const [isLfg, setIsLfg] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // 0. Fetch Auth User
  useEffect(() => {
    async function loadIdentity() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('username, player_tag, club_name, role, avatar_url').eq('id', user.id).single();
        if (profile) {
          setCurrentUser({
             id: user.id,
             username: profile.role === 'club' ? profile.club_name : profile.username,
             tag: `@${profile.player_tag || user.email.split('@')[0]}`,
             avatar_url: profile.avatar_url
          });
        }
      }
    }
    loadIdentity();
  }, []);

  // 1. Fetch RAWG Games safely through internal API
  useEffect(() => {
    async function fetchGames() {
      try {
        const res = await fetch(`/api/games?page_size=10`);
        const data = await res.json();
        if (data && data.results) {
          const fetchedGames = ["All", ...data.results.map(g => g.name)];
          setGamesList(fetchedGames);
          
          if (initialGameUrlParam && !fetchedGames.includes(initialGameUrlParam)) {
             setGamesList(prev => ["All", initialGameUrlParam, ...prev.filter(g => g !== "All")]);
          }
        }
      } catch (err) {
        console.error("Internal API Error", err);
      }
    }
    fetchGames();
  }, [initialGameUrlParam]);

  // 2. Fetch Spaces Feed (Supabase or Mock) + Realtime
  useEffect(() => {
    let channel;
    async function loadFeed() {
      setLoading(true);
      const data = await fetchSpacePosts(activeFilter);
      setFeed(data);
      setLoading(false);

      // Subscribe to Realtime updates
      channel = subscribeToPosts(activeFilter, (newPost) => {
        setFeed(prev => {
          // avoid duplicates if optimistic update already pushed temp id
          if (prev.some(p => p.content === newPost.content && p.user_name === newPost.user_name)) {
            return prev;
          }
          return [newPost, ...prev];
        });
      });
    }
    
    loadFeed();

    return () => {
      if (channel) channel.unsubscribe();
    };
  }, [activeFilter]);

  // Optimistic UI Interactions synced with Supabase Backend
  const handleLike = async (id) => {
    const postToLike = feed.find(p => p.id === id);
    if (!postToLike) return;
    
    // Optimistic
    setFeed(prev => prev.map(p => {
      if (p.id === id) {
        const isLiked = p.hasLiked;
        return { ...p, likes: isLiked ? p.likes - 1 : p.likes + 1, hasLiked: !isLiked };
      }
      return p;
    }));

    if (!postToLike.hasLiked && !String(postToLike.id).startsWith('temp')) {
      await incrementPostLike(postToLike.id, postToLike.likes);
    }
  };

  const handleRepost = async (id) => {
    const postToRepost = feed.find(p => p.id === id);
    if (!postToRepost) return;

    // Optimistic
    setFeed(prev => prev.map(p => {
      if (p.id === id && !p.hasReposted) {
        return { ...p, reposts: p.reposts + 1, hasReposted: true };
      }
      return p;
    }));

    if (!postToRepost.hasReposted && !String(postToRepost.id).startsWith('temp')) {
      await incrementPostRepost(postToRepost.id, postToRepost.reposts);
    }
  };

  const handlePost = async () => {
    if (!newPostContent.trim()) return;
    
    const postUsername = currentUser ? currentUser.username : "لاعب زائر";
    const postTag = currentUser ? currentUser.tag : "@anonymous";

    const newPostPayload = {
      user_name: postUsername,
      user_tag: postTag,
      game: activeFilter === "All" ? "General" : activeFilter,
      content: newPostContent,
      likes: 0,
      reposts: 0,
      comments: 0,
      is_looking_for_team: isLfg,
      user_id: currentUser ? currentUser.id : null
    };

    // 1. Optimistic Update
    const tempId = `temp_${Date.now()}`;
    const optimisticPost = { ...newPostPayload, id: tempId, created_at: new Date().toISOString() };
    setFeed(prev => [optimisticPost, ...prev]);
    setNewPostContent('');
    setIsLfg(false);

    // 2. Persist to Backend
    const persistedPost = await insertPost(newPostPayload);
    // Replace temp id with real id implicitly through realtime subscription OR silent update
    setFeed(prev => prev.map(p => p.id === tempId ? { ...p, id: persistedPost.id } : p));
  };

  const displayFeed = feed.length > 0 ? feed : (!loading ? [{
    id: 'system_dummy',
    user_name: "نظام_ArenaHub",
    user_tag: "@arenahub",
    game: activeFilter,
    content: `مرحباً بك في مساحة ${activeFilter}! كن أول من يبدأ المحادثة هنا.`,
    likes: 0, reposts: 0, comments: 0, created_at: new Date().toISOString(), is_looking_for_team: false
  }] : []);

  const currentOnlineUsers = activeFilter === "All" 
    ? displayFeed.reduce((acc, curr) => acc + (curr.online_users || 10), 0)
    : (displayFeed[0]?.online_users || 42);

  return (
    <div className={styles.spacesWrapper}>
      <div className={styles.container}>
        
        {/* Left Sidebar / Meta */}
        <aside className={styles.sidebar}>
          <div className={`${styles.trendingBox} glass-panel`}>
            <div className={styles.trendingHeader}>
              <Flame size={20} className={styles.flameIcon} />
              <h3>{t('trending')} أبرز المواضيع</h3>
            </div>
            <ul>
              <li className={styles.trendingItem}>
                <span className={styles.hash}>#</span>
                <div>
                  <p>EsportsWorldCup</p>
                  <small>12.5K منشور</small>
                </div>
              </li>
              <li className={styles.trendingItem}>
                <span className={styles.hash}>#</span>
                <div>
                  <p>{activeFilter !== "All" ? `${activeFilter}Riyadh` : "ValorantRiyadh"}</p>
                  <small>8.2K منشور</small>
                </div>
              </li>
              <li className={styles.trendingItem}>
                <span className={styles.hash}>#</span>
                <div>
                  <p>LFG_Saudi</p>
                  <small>3.1K منشور</small>
                </div>
              </li>
            </ul>
          </div>
        </aside>

        {/* Main Feed Area */}
        <main className={styles.feedMain}>
          <div className={styles.headerArea}>
            <div className={styles.header}>
              <h1>{activeFilter === "All" ? t('title') : `مساحة ${activeFilter}`}</h1>
              <p className={styles.subtitle}>{t('subtitle')}</p>
            </div>
            {activeFilter !== "All" && (
              <div className={styles.spaceMeta}>
                <div className={styles.onlineBadge}>
                  <span className={styles.pulseDot}></span>
                  <b>{typeof currentOnlineUsers === "number" ? currentOnlineUsers : 42}</b> متصل
                </div>
                <button className={styles.joinSpaceBtn}>انضم للمساحة</button>
              </div>
            )}
          </div>

          {/* Create Post Action Box */}
          <div className={`${styles.createPostBox} glass-panel`}>
            <div className={styles.postInputArea}>
              <div className={styles.myAvatar}></div>
              <textarea 
                placeholder={activeFilter === "All" ? t('placeholder') : `ماذا يحدث في ${activeFilter}؟`} 
                rows={2}
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
              ></textarea>
            </div>
            <div className={styles.postActions}>
              <div className={styles.actionIcons}>
                <button className={styles.iconBtn}><ImageIcon size={20} /></button>
                <button 
                  className={`${styles.iconBtn} ${isLfg ? styles.activeLfgToggle : ''}`} 
                  onClick={() => setIsLfg(!isLfg)}
                  title="Toggle LFG tag"
                >
                  <Users size={20} />
                </button>
              </div>
              <button 
                className={styles.publishBtn} 
                onClick={handlePost} 
                disabled={!newPostContent.trim()}
                style={{ opacity: !newPostContent.trim() ? 0.5 : 1, cursor: !newPostContent.trim() ? 'not-allowed' : 'pointer' }}
              >
                {t('post')}
              </button>
            </div>
          </div>

          {/* Horizontal Game Filters */}
          <div className={styles.filterWrapper}>
            <div className={styles.filterBar}>
              {gamesList.map(game => (
                <button 
                  key={game} 
                  className={`${styles.filterChip} ${activeFilter === game ? styles.activeChip : ''}`}
                  onClick={() => setActiveFilter(game)}
                >
                  {game === "All" ? <Gamepad2 size={16} /> : null}
                  {game === "All" ? "الكل" : game}
                </button>
              ))}
            </div>
          </div>

          {/* Feed Stream */}
          <div className={styles.feedStream}>
            <AnimatePresence>
              {displayFeed.map((post, index) => (
                <motion.div 
                  key={post.id} 
                  className={`${styles.postCard} glass-panel`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <div className={styles.postHeader}>
                    <div className={styles.avatarPlaceholder}>{post.user_name?.charAt(0) || 'U'}</div>
                    <div className={styles.postMeta}>
                      <span className={styles.userName}>{post.user_name}</span>
                      <span className={styles.userTag}>{post.user_tag}</span>
                      <span className={styles.postTime}>• {timeAgo(post.created_at)}</span>
                    </div>
                    {post.is_looking_for_team && (
                      <span className={styles.lfgBadge}>بحث عن فريق</span>
                    )}
                    <span className={styles.gameBadge}>{post.game}</span>
                  </div>
                  
                  <div className={styles.postBody}>
                    <p className={styles.postContent}>{post.content}</p>
                    {post.media && (
                      <div className={styles.postMedia}>
                        <img src={post.media} alt="Post media" />
                      </div>
                    )}
                  </div>

                  <div className={styles.interactionRow}>
                    <button className={styles.intBtn}><MessageSquare size={18} /> <span>{post.comments}</span></button>
                    <button 
                      className={`${styles.intBtn} ${styles.repostBtn} ${post.hasReposted ? styles.activeInt : ''}`}
                      onClick={() => handleRepost(post.id)}
                    >
                      <Repeat2 size={18} /> <span>{post.reposts}</span>
                    </button>
                    <button 
                      className={`${styles.intBtn} ${styles.likeBtn} ${post.hasLiked ? styles.activeHeart : ''}`}
                      onClick={() => handleLike(post.id)}
                    >
                      <Heart size={18} fill={post.hasLiked ? "#f43f5e" : "transparent"} /> <span>{post.likes}</span>
                    </button>
                    <button className={styles.intBtn}><Share size={18} /></button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </main>
        
        {/* Right Sidebar - Active Members / Clubs connection */}
        <aside className={styles.rightBar}>
          <div className={`${styles.activeUsersBox} glass-panel`}>
             <h3>أبرز المساهمين</h3>
             <div className={styles.userList}>
               {[1,2,3,4].map(idx => (
                 <div key={idx} className={styles.miniUser}>
                   <div className={styles.miniAvatar}></div>
                   <div className={styles.miniUserInfo}>
                     <span className={styles.muName}>Player_{idx}0{idx}</span>
                     <span className={styles.muLevel}>المستوى {10 * idx}</span>
                   </div>
                   <button className={styles.followBtn}>متابعة</button>
                 </div>
               ))}
             </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
